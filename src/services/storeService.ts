import {
  collection,
  deleteDoc,
  doc,
  getDocs,
  onSnapshot,
  runTransaction,
  setDoc,
  updateDoc,
  writeBatch,
  type Firestore,
} from 'firebase/firestore';
import { SEED_PRODUCTS } from '../data/seedCatalog';
import type { OrderStatus, Product, RentalOrder } from '../types';
import {
  computeOrderStatusTransition,
  computeStockAfterStep,
  filterCustomerOrders,
  normalizeProductStock,
} from '../utils/rentalMath';
import { getFirebaseServices } from './firebaseApp';

const PRODUCTS_STORAGE_KEY = 'lot_products_v1';
const ORDERS_STORAGE_KEY = 'lot_orders_v1';
const PRODUCTS_COLLECTION = 'products';
const ORDERS_COLLECTION = 'orders';

export type SyncMode = 'connecting' | 'firestore' | 'local';

export interface SyncStatus {
  mode: SyncMode;
  notice: string | null;
}

type Listener<T> = (data: T) => void;

class StoreService {
  private db: Firestore | null = null;
  private products: Product[] = [];
  private orders: RentalOrder[] = [];
  private syncStatus: SyncStatus = { mode: 'connecting', notice: null };

  private productListeners = new Set<Listener<Product[]>>();
  private orderListeners = new Set<Listener<RentalOrder[]>>();
  private statusListeners = new Set<Listener<SyncStatus>>();

  private initialized = false;
  private seedAttempted = false;
  private unsubProducts: (() => void) | null = null;
  private unsubOrders: (() => void) | null = null;
  private fallbackTimer: ReturnType<typeof setTimeout> | null = null;
  private writeQueue: Promise<unknown> = Promise.resolve();

  private enqueueWrite<T>(task: () => Promise<T>): Promise<T> {
    const next = this.writeQueue.then(task, task);
    this.writeQueue = next.catch(() => undefined);
    return next;
  }

  private ensureInitialized() {
    if (this.initialized) return;
    this.initialized = true;

    const cachedProducts = this.readLocalProducts();
    const cachedOrders = this.readLocalOrders();
    if (cachedProducts.length > 0) {
      this.products = cachedProducts;
    }
    if (cachedOrders.length > 0) {
      this.orders = cachedOrders;
    }

    if (typeof window !== 'undefined') {
      window.addEventListener('storage', (e) => {
        if (e.key === PRODUCTS_STORAGE_KEY) {
          this.products = this.readLocalProducts();
          this.emitProducts();
        } else if (e.key === ORDERS_STORAGE_KEY) {
          this.orders = this.readLocalOrders();
          this.emitOrders();
        }
      });
    }

    const services = getFirebaseServices();
    if (!services) {
      this.activateLocalFallback(
        'Cloud database unavailable right now. Changes are saved locally in your browser.',
      );
      return;
    }

    this.db = services.db;
    this.startFirestoreListeners();
  }

  private startFirestoreListeners() {
    if (!this.db) return;

    this.fallbackTimer = setTimeout(() => {
      if (this.syncStatus.mode === 'connecting') {
        this.activateLocalFallback(
          'Live cloud sync is taking longer than expected. Running in local storage mode.',
        );
      }
    }, 3500);

    const productsRef = collection(this.db, PRODUCTS_COLLECTION);
    this.unsubProducts = onSnapshot(
      productsRef,
      async (snapshot) => {
        if (this.fallbackTimer) {
          clearTimeout(this.fallbackTimer);
          this.fallbackTimer = null;
        }

        if (snapshot.empty && !this.seedAttempted) {
          this.seedAttempted = true;
          await this.seedFirestoreCatalog();
          return;
        }

        const remoteProducts = snapshot.docs
          .map((d) =>
            normalizeProductStock({
              ...(d.data() as Partial<Product>),
              id: d.id,
            }),
          )
          .sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0));

        this.products = remoteProducts;
        this.writeLocalProducts(remoteProducts);
        this.setSyncStatus({ mode: 'firestore', notice: null });
        this.emitProducts();
      },
      () => {
        this.activateLocalFallback(
          'Cloud Firestore is temporarily unreachable or restricted. Switched to local browser storage.',
        );
      },
    );

    const ordersRef = collection(this.db, ORDERS_COLLECTION);
    this.unsubOrders = onSnapshot(
      ordersRef,
      (snapshot) => {
        const remoteOrders = snapshot.docs
          .map((d) => {
            const raw = d.data() as Partial<RentalOrder>;
            return {
              ...(raw as Omit<RentalOrder, 'id'>),
              id: d.id,
              stockDeducted:
                typeof raw.stockDeducted === 'boolean'
                  ? raw.stockDeducted
                  : raw.status !== 'Returned' && raw.status !== 'Cancelled',
            } as RentalOrder;
          })
          .sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0));

        this.orders = remoteOrders;
        this.writeLocalOrders(remoteOrders);
        this.emitOrders();
      },
      () => {
        this.activateLocalFallback(
          'Cloud Firestore is temporarily unreachable or restricted. Switched to local browser storage.',
        );
      },
    );
  }

  private async seedFirestoreCatalog() {
    if (!this.db) return;
    try {
      const batch = writeBatch(this.db);
      for (const item of SEED_PRODUCTS) {
        const ref = doc(this.db, PRODUCTS_COLLECTION, item.id);
        batch.set(ref, item);
      }
      await batch.commit();
      this.products = [...SEED_PRODUCTS];
      this.writeLocalProducts(this.products);
      this.setSyncStatus({ mode: 'firestore', notice: null });
      this.emitProducts();
    } catch {
      this.activateLocalFallback(
        'Cloud Firestore write permissions are restricted. Loaded sample catalog locally.',
      );
    }
  }

  private activateLocalFallback(notice: string) {
    if (this.fallbackTimer) {
      clearTimeout(this.fallbackTimer);
      this.fallbackTimer = null;
    }

    if (this.unsubProducts) {
      this.unsubProducts();
      this.unsubProducts = null;
    }
    if (this.unsubOrders) {
      this.unsubOrders();
      this.unsubOrders = null;
    }

    const existingProducts = this.readLocalProducts();
    if (existingProducts.length === 0) {
      this.products = [...SEED_PRODUCTS];
      this.writeLocalProducts(this.products);
    } else {
      this.products = existingProducts;
    }

    this.orders = this.readLocalOrders();
    this.setSyncStatus({ mode: 'local', notice });
    this.emitProducts();
    this.emitOrders();
  }

  private readLocalProducts(): Product[] {
    try {
      const raw = localStorage.getItem(PRODUCTS_STORAGE_KEY);
      if (!raw) return [];
      const parsed = JSON.parse(raw);
      return Array.isArray(parsed)
        ? parsed.map((item) => normalizeProductStock(item))
        : [];
    } catch {
      return [];
    }
  }

  private writeLocalProducts(items: Product[]) {
    try {
      localStorage.setItem(PRODUCTS_STORAGE_KEY, JSON.stringify(items));
    } catch {
      // Ignore storage quota errors
    }
  }

  private readLocalOrders(): RentalOrder[] {
    try {
      const raw = localStorage.getItem(ORDERS_STORAGE_KEY);
      if (!raw) return [];
      const parsed = JSON.parse(raw);
      return Array.isArray(parsed) ? parsed : [];
    } catch {
      return [];
    }
  }

  private writeLocalOrders(items: RentalOrder[]) {
    try {
      localStorage.setItem(ORDERS_STORAGE_KEY, JSON.stringify(items));
    } catch {
      // Ignore storage quota errors
    }
  }

  private setSyncStatus(next: SyncStatus) {
    this.syncStatus = next;
    for (const cb of this.statusListeners) {
      cb(this.syncStatus);
    }
  }

  private emitProducts() {
    const snapshot = [...this.products];
    for (const cb of this.productListeners) {
      cb(snapshot);
    }
  }

  private emitOrders() {
    const snapshot = [...this.orders];
    for (const cb of this.orderListeners) {
      cb(snapshot);
    }
  }

  subscribeProducts(listener: Listener<Product[]>): () => void {
    this.ensureInitialized();
    this.productListeners.add(listener);
    if (this.products.length > 0 || this.syncStatus.mode !== 'connecting') {
      listener([...this.products]);
    }
    return () => {
      this.productListeners.delete(listener);
    };
  }

  subscribeOrders(listener: Listener<RentalOrder[]>): () => void {
    this.ensureInitialized();
    this.orderListeners.add(listener);
    if (this.orders.length > 0 || this.syncStatus.mode !== 'connecting') {
      listener([...this.orders]);
    }
    return () => {
      this.orderListeners.delete(listener);
    };
  }

  /**
   * Real-time subscription for a logged-in customer's orders.
   * Listens to the `orders` collection without combining `where()` + `orderBy()`
   * (avoiding Firestore composite index requirements), matches by `userId` OR
   * case-insensitive `customerEmail`, and sorts newest-first in JavaScript.
   */
  subscribeCustomerOrders(
    userId: string,
    email: string,
    listener: Listener<RentalOrder[]>,
  ): () => void {
    return this.subscribeOrders((allOrders) => {
      listener(filterCustomerOrders(allOrders, userId, email));
    });
  }

  subscribeSyncStatus(listener: Listener<SyncStatus>): () => void {
    this.ensureInitialized();
    this.statusListeners.add(listener);
    listener(this.syncStatus);
    return () => {
      this.statusListeners.delete(listener);
    };
  }

  /**
   * Creates a booking and atomically deducts 1 unit of stock using a Firestore transaction
   * to prevent double-booking across concurrent customers.
   */
  async createOrder(
    orderInput: Omit<RentalOrder, 'id' | 'stockDeducted'>,
  ): Promise<RentalOrder> {
    return this.enqueueWrite(async () => {
      this.ensureInitialized();
      const id = `ord-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
      const newOrder: RentalOrder = {
        ...orderInput,
        id,
        stockDeducted: true,
      };

      const localProd = this.products.find((p) => p.id === orderInput.productId);
      if (localProd && localProd.availableQuantity <= 0) {
        throw new Error('Sorry, this item just went out of stock.');
      }

      if (this.db && this.syncStatus.mode === 'firestore') {
        try {
          const committedProduct = await runTransaction(this.db, async (tx) => {
            const prodRef = doc(this.db!, PRODUCTS_COLLECTION, orderInput.productId);
            const prodSnap = await tx.get(prodRef);

            if (!prodSnap.exists()) {
              throw new Error('This item is no longer available in the catalog.');
            }

            const normalized = normalizeProductStock({
              ...(prodSnap.data() as Partial<Product>),
              id: prodSnap.id,
            });

            if (normalized.availableQuantity < 1) {
              throw new Error(
                'Sorry, all units of this item were just booked by another customer.',
              );
            }

            const nextAvail = normalized.availableQuantity - 1;
            const nextProdState = {
              totalQuantity: normalized.totalQuantity,
              availableQuantity: nextAvail,
              available: nextAvail > 0,
            };
            tx.update(prodRef, nextProdState);

            const orderRef = doc(this.db!, ORDERS_COLLECTION, id);
            tx.set(orderRef, newOrder);
            return nextProdState;
          });

          this.products = this.products.map((p) =>
            p.id === orderInput.productId ? { ...p, ...committedProduct } : p,
          );
          this.writeLocalProducts(this.products);
          this.emitProducts();

          this.orders = [newOrder, ...this.orders.filter((o) => o.id !== id)];
          this.writeLocalOrders(this.orders);
          this.emitOrders();

          return newOrder;
        } catch (err) {
          if (
            err instanceof Error &&
            (err.message.includes('out of stock') ||
              err.message.includes('just booked') ||
              err.message.includes('no longer available'))
          ) {
            throw err;
          }
          this.setSyncStatus({
            mode: 'local',
            notice:
              'Could not reach Cloud Firestore for transaction. Order saved locally in this browser.',
          });
        }
      }

      // Local storage atomic stock deduction fallback
      if (localProd) {
        if (localProd.availableQuantity < 1) {
          throw new Error('Sorry, this item is currently out of stock.');
        }
        const nextAvail = localProd.availableQuantity - 1;
        this.products = this.products.map((p) =>
          p.id === localProd.id
            ? { ...p, availableQuantity: nextAvail, available: nextAvail > 0 }
            : p,
        );
        this.writeLocalProducts(this.products);
        this.emitProducts();
      }

      this.orders = [newOrder, ...this.orders];
      this.writeLocalOrders(this.orders);
      this.emitOrders();
      return newOrder;
    });
  }

  /**
   * Updates an order status and atomically restores or deducts 1 unit of stock
   * guarded by `order.stockDeducted` so stock is never double-counted.
   */
  async updateOrderStatus(
    orderId: string,
    status: OrderStatus,
  ): Promise<void> {
    return this.enqueueWrite(async () => {
      this.ensureInitialized();
      const targetOrder = this.orders.find((o) => o.id === orderId);
      if (!targetOrder) return;

      if (this.db && this.syncStatus.mode === 'firestore') {
        try {
          const result = await runTransaction(this.db, async (tx) => {
            const orderRef = doc(this.db!, ORDERS_COLLECTION, orderId);
            const orderSnap = await tx.get(orderRef);
            if (!orderSnap.exists()) return null;

            const currentOrder = orderSnap.data() as RentalOrder;
            const currentlyDeducted =
              typeof currentOrder.stockDeducted === 'boolean'
                ? currentOrder.stockDeducted
                : currentOrder.status !== 'Returned' &&
                  currentOrder.status !== 'Cancelled';

            const prodRef = doc(
              this.db!,
              PRODUCTS_COLLECTION,
              currentOrder.productId,
            );
            const prodSnap = await tx.get(prodRef);

            if (!prodSnap.exists()) {
              const nextStockDeducted =
                status === 'Returned' || status === 'Cancelled'
                  ? false
                  : currentlyDeducted;
              tx.update(orderRef, { status, stockDeducted: nextStockDeducted });
              return {
                productId: currentOrder.productId,
                nextStockDeducted,
                productUpdate: null,
              };
            }

            const prod = normalizeProductStock({
              ...(prodSnap.data() as Partial<Product>),
              id: prodSnap.id,
            });

            const transition = computeOrderStatusTransition(
              currentlyDeducted,
              status,
              prod.totalQuantity,
              prod.availableQuantity,
            );

            if (transition.stockChanged) {
              tx.update(prodRef, {
                totalQuantity: transition.totalQuantity,
                availableQuantity: transition.availableQuantity,
                available: transition.available,
              });
            }

            tx.update(orderRef, {
              status,
              stockDeducted: transition.nextStockDeducted,
            });

            return {
              productId: currentOrder.productId,
              nextStockDeducted: transition.nextStockDeducted,
              productUpdate: transition.stockChanged
                ? {
                    totalQuantity: transition.totalQuantity,
                    availableQuantity: transition.availableQuantity,
                    available: transition.available,
                  }
                : null,
            };
          });

          if (result) {
            if (result.productUpdate) {
              this.products = this.products.map((p) =>
                p.id === result.productId ? { ...p, ...result.productUpdate } : p,
              );
              this.writeLocalProducts(this.products);
              this.emitProducts();
            }

            this.orders = this.orders.map((o) =>
              o.id === orderId
                ? {
                    ...o,
                    status,
                    stockDeducted: result.nextStockDeducted,
                  }
                : o,
            );
            this.writeLocalOrders(this.orders);
            this.emitOrders();
          }
          return;
        } catch {
          this.setSyncStatus({
            mode: 'local',
            notice:
              'Cloud Firestore update failed. Status updated locally in browser storage.',
          });
        }
      }

      // Local storage fallback
      const prod = this.products.find((p) => p.id === targetOrder.productId);
      let nextDeducted = targetOrder.stockDeducted;

      if (prod) {
        const transition = computeOrderStatusTransition(
          targetOrder.stockDeducted,
          status,
          prod.totalQuantity,
          prod.availableQuantity,
        );
        nextDeducted = transition.nextStockDeducted;
        if (transition.stockChanged) {
          this.products = this.products.map((p) =>
            p.id === prod.id
              ? {
                  ...p,
                  totalQuantity: transition.totalQuantity,
                  availableQuantity: transition.availableQuantity,
                  available: transition.available,
                }
              : p,
          );
          this.writeLocalProducts(this.products);
          this.emitProducts();
        }
      } else if (status === 'Returned' || status === 'Cancelled') {
        nextDeducted = false;
      }

      this.orders = this.orders.map((o) =>
        o.id === orderId
          ? { ...o, status, stockDeducted: nextDeducted }
          : o,
      );
      this.writeLocalOrders(this.orders);
      this.emitOrders();
    });
  }

  async saveProduct(
    input: Omit<Product, 'id' | 'createdAt'>,
    existingId?: string,
  ): Promise<Product> {
    return this.enqueueWrite(async () => {
      this.ensureInitialized();
      const isEdit = Boolean(existingId);
      const id =
        existingId || `item-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
      const existing = existingId
        ? this.products.find((p) => p.id === existingId)
        : undefined;

      const product: Product = normalizeProductStock({
        ...input,
        id,
        createdAt: existing?.createdAt ?? Date.now(),
      });

      if (isEdit) {
        this.products = this.products.map((p) => (p.id === id ? product : p));
      } else {
        this.products = [product, ...this.products];
      }
      this.writeLocalProducts(this.products);
      this.emitProducts();

      if (this.db && this.syncStatus.mode === 'firestore') {
        try {
          await setDoc(doc(this.db, PRODUCTS_COLLECTION, id), product);
        } catch {
          this.setSyncStatus({
            mode: 'local',
            notice:
              'Cloud Firestore save failed. Item stored locally in browser storage.',
          });
        }
      }

      return product;
    });
  }

  async adjustProductStock(productId: string, delta: 1 | -1): Promise<void> {
    return this.enqueueWrite(async () => {
      this.ensureInitialized();
      const target = this.products.find((p) => p.id === productId);
      if (!target) return;

      const nextStock = computeStockAfterStep(
        target.totalQuantity,
        target.availableQuantity,
        delta,
      );

      this.products = this.products.map((p) =>
        p.id === productId ? { ...p, ...nextStock } : p,
      );
      this.writeLocalProducts(this.products);
      this.emitProducts();

      if (this.db && this.syncStatus.mode === 'firestore') {
        try {
          await updateDoc(doc(this.db, PRODUCTS_COLLECTION, productId), nextStock);
        } catch {
          this.setSyncStatus({
            mode: 'local',
            notice: 'Cloud Firestore update failed. Saved stock change locally.',
          });
        }
      }
    });
  }

  async toggleProductAvailability(productId: string): Promise<void> {
    return this.enqueueWrite(async () => {
      this.ensureInitialized();
      const target = this.products.find((p) => p.id === productId);
      if (!target) return;

      const nextAvailable = target.availableQuantity <= 0;
      const nextAvailableQty = nextAvailable ? target.totalQuantity : 0;

      this.products = this.products.map((p) =>
        p.id === productId
          ? {
              ...p,
              available: nextAvailable,
              availableQuantity: nextAvailableQty,
            }
          : p,
      );
      this.writeLocalProducts(this.products);
      this.emitProducts();

      if (this.db && this.syncStatus.mode === 'firestore') {
        try {
          await updateDoc(doc(this.db, PRODUCTS_COLLECTION, productId), {
            available: nextAvailable,
            availableQuantity: nextAvailableQty,
          });
        } catch {
          this.setSyncStatus({
            mode: 'local',
            notice: 'Cloud Firestore update failed. Saved change locally.',
          });
        }
      }
    });
  }

  async deleteProduct(productId: string): Promise<void> {
    return this.enqueueWrite(async () => {
      this.ensureInitialized();

      this.products = this.products.filter((p) => p.id !== productId);
      this.writeLocalProducts(this.products);
      this.emitProducts();

      if (this.db && this.syncStatus.mode === 'firestore') {
        try {
          await deleteDoc(doc(this.db, PRODUCTS_COLLECTION, productId));
        } catch {
          this.setSyncStatus({
            mode: 'local',
            notice: 'Cloud Firestore delete failed. Removed item locally.',
          });
        }
      }
    });
  }

  async resetSampleCatalog(): Promise<void> {
    return this.enqueueWrite(async () => {
      this.ensureInitialized();

      this.products = [...SEED_PRODUCTS];
      this.writeLocalProducts(this.products);
      this.emitProducts();

      if (this.db && this.syncStatus.mode === 'firestore') {
        try {
          const snap = await getDocs(collection(this.db, PRODUCTS_COLLECTION));
          const batch = writeBatch(this.db);
          snap.docs.forEach((d) => batch.delete(d.ref));
          for (const item of SEED_PRODUCTS) {
            batch.set(doc(this.db, PRODUCTS_COLLECTION, item.id), item);
          }
          await batch.commit();
        } catch {
          this.setSyncStatus({
            mode: 'local',
            notice:
              'Cloud Firestore reset failed. Restored sample catalog locally.',
          });
        }
      }
    });
  }
}

export const storeService = new StoreService();

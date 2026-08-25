import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '../services/api';
import { useToast } from '../context/ToastContext';
import {
  ShoppingBag,
  Plus,
  Search,
  RefreshCw,
  Edit2,
  Trash2,
  Share2,
  X,
  Check,
  Tag,
  Package,
  ExternalLink,
  ShieldCheck,
  Smartphone,
  Eye,
  AlertCircle
} from 'lucide-react';

export default function CatalogPage() {
  const queryClient = useQueryClient();
  const toast = useToast();

  const [searchQuery, setSearchQuery] = useState('');
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState(null);

  const [productForm, setProductForm] = useState({
    name: '',
    description: '',
    price: 999,
    retailerId: '',
    availability: 'IN_STOCK',
    category: 'Software & SaaS',
    imageUrl: 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=500&auto=format&fit=crop&q=60'
  });

  // 1. Fetch Products
  const { data: productsRes, isLoading } = useQuery({
    queryKey: ['catalog-products'],
    queryFn: () => api.get('/catalog/products')
  });
  const products = productsRes?.data || [];

  // Mutations
  const createProductMutation = useMutation({
    mutationFn: (data) => api.post('/catalog/products', data),
    onSuccess: () => {
      setIsAddModalOpen(false);
      setProductForm({
        name: '',
        description: '',
        price: 999,
        retailerId: '',
        availability: 'IN_STOCK',
        category: 'Software & SaaS',
        imageUrl: 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=500&auto=format&fit=crop&q=60'
      });
      queryClient.invalidateQueries({ queryKey: ['catalog-products'] });
      toast.success('Product registered in WhatsApp Catalog & Meta Commerce!', 'Product Created');
    }
  });

  const updateProductMutation = useMutation({
    mutationFn: ({ id, data }) => api.put(`/catalog/products/${id}`, data),
    onSuccess: () => {
      setEditingProduct(null);
      queryClient.invalidateQueries({ queryKey: ['catalog-products'] });
      toast.success('Product updated in WhatsApp Catalog.', 'Saved');
    }
  });

  const deleteProductMutation = useMutation({
    mutationFn: (id) => api.delete(`/catalog/products/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['catalog-products'] });
      toast.success('Product removed from catalog.', 'Deleted');
    }
  });

  const syncCatalogMutation = useMutation({
    mutationFn: () => {
      const loadId = toast.loading('Syncing products with Meta Commerce Manager...', 'Syncing Catalog');
      return api.post('/catalog/sync').then((res) => {
        toast.dismiss(loadId);
        return res;
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['catalog-products'] });
      toast.success('WhatsApp Catalog synchronized with Meta Commerce Manager!', 'Catalog Live');
    }
  });

  const filteredProducts = products.filter(
    (p) =>
      p.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      p.retailerId?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="p-4 md:p-8 max-w-[1700px] mx-auto space-y-6 pb-24">
      {/* 1. TOP HEADER */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-extrabold text-slate-900 tracking-tight flex items-center space-x-2">
            <ShoppingBag className="w-6 h-6 text-emerald-600" />
            <span>WhatsApp Product Catalog & Commerce</span>
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Meta Commerce Manager integration. Send Single-Product (SPM) and Multi-Product (MPM) messages directly into customer chats.
          </p>
        </div>

        <div className="flex items-center space-x-2.5">
          <button
            onClick={() => syncCatalogMutation.mutate()}
            disabled={syncCatalogMutation.isPending}
            className="px-3.5 py-2 bg-white hover:bg-slate-50 border border-slate-200 text-slate-700 rounded-xl text-xs font-bold shadow-xs transition flex items-center space-x-1.5"
          >
            <RefreshCw className={`w-3.5 h-3.5 text-emerald-600 ${syncCatalogMutation.isPending ? 'animate-spin' : ''}`} />
            <span>Sync Meta Commerce</span>
          </button>

          <button
            onClick={() => setIsAddModalOpen(true)}
            className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold shadow-md shadow-emerald-500/20 transition flex items-center space-x-1.5"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>+ Add Product</span>
          </button>
        </div>
      </div>

      {/* 2. STATS BAR */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs flex items-center justify-between">
          <div>
            <p className="text-xs font-bold text-slate-500">Total Products in Catalog</p>
            <p className="text-2xl font-black text-slate-900">{products.length}</p>
          </div>
          <Package className="w-8 h-8 text-emerald-600 opacity-80" />
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs flex items-center justify-between">
          <div>
            <p className="text-xs font-bold text-slate-500">Meta WABA Catalog Status</p>
            <p className="text-sm font-black text-emerald-700 flex items-center space-x-1 mt-1">
              <ShieldCheck className="w-4 h-4" />
              <span>APPROVED & ACTIVE</span>
            </p>
          </div>
          <ShoppingBag className="w-8 h-8 text-blue-600 opacity-80" />
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs flex items-center justify-between">
          <div>
            <p className="text-xs font-bold text-slate-500">In-Chat Commerce Currency</p>
            <p className="text-2xl font-black text-slate-900">INR (₹)</p>
          </div>
          <Smartphone className="w-8 h-8 text-purple-600 opacity-80" />
        </div>
      </div>

      {/* 3. SEARCH & PRODUCTS GRID */}
      <div className="space-y-4">
        <div className="flex items-center justify-between bg-white p-3.5 rounded-2xl border border-slate-200 shadow-xs">
          <div className="relative w-full sm:w-80">
            <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-2.5" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search products by title, SKU..."
              className="w-full pl-8 pr-3 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:outline-hidden focus:ring-2 focus:ring-emerald-500"
            />
          </div>
          <p className="text-xs font-bold text-slate-500">Showing {filteredProducts.length} items</p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {filteredProducts.map((p) => (
            <div key={p._id} className="bg-white rounded-3xl border border-slate-200 shadow-xs overflow-hidden flex flex-col justify-between group hover:shadow-md transition">
              <div>
                <div className="h-44 bg-slate-100 relative overflow-hidden">
                  <img
                    src={p.imageUrl || 'https://images.unsplash.com/photo-1551288049-bebda4e38f71?w=500&auto=format&fit=crop&q=60'}
                    alt={p.name}
                    className="w-full h-full object-cover group-hover:scale-105 transition duration-300"
                  />
                  <span className={`absolute top-3 right-3 px-2.5 py-0.5 rounded-lg text-[10px] font-black uppercase shadow-xs ${
                    p.availability === 'IN_STOCK' ? 'bg-emerald-500 text-white' : 'bg-slate-800 text-white'
                  }`}>
                    {p.availability === 'IN_STOCK' ? 'In Stock' : 'Out of Stock'}
                  </span>
                </div>

                <div className="p-4 space-y-2">
                  <span className="text-[10px] font-mono text-slate-400 block">{p.retailerId}</span>
                  <h3 className="text-xs font-black text-slate-900 line-clamp-1">{p.name}</h3>
                  <p className="text-[11px] text-slate-500 line-clamp-2 leading-relaxed">{p.description}</p>
                  <p className="text-base font-black text-emerald-700 font-mono">₹{p.price.toLocaleString('en-IN')}</p>
                </div>
              </div>

              <div className="p-3 bg-slate-50 border-t border-slate-100 flex items-center justify-between">
                <button
                  onClick={() => {
                    toast.info(`Single Product Message (SPM) ready to share for "${p.name}"!`, 'WhatsApp SPM');
                  }}
                  className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-[11px] font-bold transition flex items-center space-x-1 shadow-xs"
                >
                  <Share2 className="w-3 h-3" />
                  <span>Send in Chat</span>
                </button>

                <div className="flex items-center space-x-1">
                  <button
                    onClick={() => setEditingProduct(p)}
                    className="p-1.5 hover:bg-slate-200 text-slate-600 rounded-lg transition"
                    title="Edit Product"
                  >
                    <Edit2 className="w-3.5 h-3.5" />
                  </button>
                  <button
                    onClick={() => {
                      if (confirm(`Remove "${p.name}" from catalog?`)) deleteProductMutation.mutate(p._id);
                    }}
                    className="p-1.5 hover:bg-rose-50 text-slate-400 hover:text-rose-600 rounded-lg transition"
                    title="Delete Product"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* 4. CREATE / EDIT PRODUCT MODAL */}
      {(isAddModalOpen || editingProduct) && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="max-w-md w-full bg-white rounded-3xl shadow-2xl border border-slate-200 p-6 space-y-4 animate-in fade-in zoom-in duration-200">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="text-sm font-extrabold text-slate-900">
                {editingProduct ? 'Edit WhatsApp Product' : 'Add Product to WhatsApp Catalog'}
              </h3>
              <button
                onClick={() => {
                  setIsAddModalOpen(false);
                  setEditingProduct(null);
                }}
                className="p-1 hover:bg-slate-100 rounded-lg text-slate-400"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <div className="space-y-1">
                <label className="font-bold text-slate-700">Product Title</label>
                <input
                  type="text"
                  value={editingProduct ? editingProduct.name : productForm.name}
                  onChange={(e) =>
                    editingProduct
                      ? setEditingProduct({ ...editingProduct, name: e.target.value })
                      : setProductForm({ ...productForm, name: e.target.value })
                  }
                  placeholder="e.g. Enterprise WhatsApp Marketing Pack"
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl font-medium focus:outline-hidden"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="font-bold text-slate-700">Price (₹ INR)</label>
                  <input
                    type="number"
                    value={editingProduct ? editingProduct.price : productForm.price}
                    onChange={(e) =>
                      editingProduct
                        ? setEditingProduct({ ...editingProduct, price: +e.target.value })
                        : setProductForm({ ...productForm, price: +e.target.value })
                    }
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl font-medium focus:outline-hidden font-mono"
                  />
                </div>

                <div className="space-y-1">
                  <label className="font-bold text-slate-700">Availability</label>
                  <select
                    value={editingProduct ? editingProduct.availability : productForm.availability}
                    onChange={(e) =>
                      editingProduct
                        ? setEditingProduct({ ...editingProduct, availability: e.target.value })
                        : setProductForm({ ...productForm, availability: e.target.value })
                    }
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl font-medium focus:outline-hidden"
                  >
                    <option value="IN_STOCK">In Stock</option>
                    <option value="OUT_OF_STOCK">Out of Stock</option>
                  </select>
                </div>
              </div>

              <div className="space-y-1">
                <label className="font-bold text-slate-700">Product Image URL</label>
                <input
                  type="text"
                  value={editingProduct ? editingProduct.imageUrl : productForm.imageUrl}
                  onChange={(e) =>
                    editingProduct
                      ? setEditingProduct({ ...editingProduct, imageUrl: e.target.value })
                      : setProductForm({ ...productForm, imageUrl: e.target.value })
                  }
                  placeholder="https://..."
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl font-medium focus:outline-hidden"
                />
              </div>

              <div className="space-y-1">
                <label className="font-bold text-slate-700">Description</label>
                <textarea
                  rows={2}
                  value={editingProduct ? editingProduct.description : productForm.description}
                  onChange={(e) =>
                    editingProduct
                      ? setEditingProduct({ ...editingProduct, description: e.target.value })
                      : setProductForm({ ...productForm, description: e.target.value })
                  }
                  placeholder="Product highlights, warranty, delivery..."
                  className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl font-medium focus:outline-hidden"
                />
              </div>

              <button
                onClick={() => {
                  if (editingProduct) {
                    updateProductMutation.mutate({ id: editingProduct._id, data: editingProduct });
                  } else {
                    if (!productForm.name) {
                      toast.error('Product title is required.', 'Missing Fields');
                      return;
                    }
                    createProductMutation.mutate(productForm);
                  }
                }}
                className="w-full py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-bold shadow-md shadow-emerald-500/20 transition"
              >
                {editingProduct ? 'Update Product' : 'Save to Meta Catalog'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

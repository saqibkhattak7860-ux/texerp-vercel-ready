import React, { useState, useEffect } from 'react';
import api from '../services/api';
import DataTable from '../components/common/DataTable';
import Modal from '../components/common/Modal';
import Badge from '../components/common/Badge';
import { Plus, Pencil, Settings2, Shirt, Layers, DollarSign, Trash2, TrendingUp } from 'lucide-react';
import { useNotification } from '../context/NotificationContext';

export default function FinishedProducts() {
  const [products, setProducts] = useState([]);
  const [units, setUnits] = useState([]);
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [categoryName, setCategoryName] = useState('');
  const [editingCategory, setEditingCategory] = useState(null);
  const { showToast } = useNotification();

  const [formData, setFormData] = useState({
    product_code: '',
    name: '',
    category: 'Men Garments',
    unit_id: '3', // Pieces
    production_cost: '450',
    selling_price: '1150',
    description: ''
  });

  const fetchData = async () => {
    setLoading(true);
    try {
      const [prodRes, unitRes, categoryRes] = await Promise.all([
        api.get('/finished-products'),
        api.get('/units'),
        api.get('/garment-categories')
      ]);
      if (prodRes.data?.success) setProducts(prodRes.data.data);
      if (unitRes.data?.success) setUnits(unitRes.data.data);
      if (categoryRes.data?.success) setCategories(categoryRes.data.data);
    } catch (err) {
      showToast('Failed to load finished products', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleOpenAdd = () => {
    setFormData({
      product_code: `FP-GAR-${Date.now().toString().slice(-4)}`,
      name: '',
      category: categories[0]?.name || 'Finished Goods',
      unit_id: units[0]?.id || '3',
      production_cost: '500',
      selling_price: '1250',
      description: ''
    });
    setIsModalOpen(true);
  };

  const saveCategory = async (e) => {
    e.preventDefault();
    if (!categoryName.trim()) return;
    try {
      if (editingCategory) {
        await api.put(`/garment-categories/${editingCategory.id}`, { name: categoryName });
      } else {
        await api.post('/garment-categories', { name: categoryName });
      }
      setCategoryName('');
      setEditingCategory(null);
      fetchData();
      showToast('Garment category saved successfully');
    } catch (err) {
      showToast(err.response?.data?.message || err.message, 'error');
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      await api.post('/finished-products', formData);
      showToast('Finished product created successfully');
      setIsModalOpen(false);
      fetchData();
    } catch (err) {
      showToast(err.response?.data?.message || err.message, 'error');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (product) => {
    if (!window.confirm(`Delete finished product "${product.name}"?`)) return;
    try {
      await api.delete(`/finished-products/${product.id}`);
      showToast('Finished product deleted successfully');
      fetchData();
    } catch (err) {
      showToast(err.response?.data?.message || err.message, 'error');
    }
  };

  const deleteCategory = async (category) => {
    if (!window.confirm(`Delete garment category "${category.name}"?`)) return;
    try {
      await api.delete(`/garment-categories/${category.id}`);
      if (editingCategory?.id === category.id) {
        setEditingCategory(null);
        setCategoryName('');
      }
      fetchData();
      showToast('Garment category deleted successfully');
    } catch (err) {
      showToast(err.response?.data?.message || err.message, 'error');
    }
  };

  const columns = [
    {
      header: 'Product Code',
      accessor: 'product_code',
      render: (row) => <span className="font-mono font-bold text-brand-400">{row.product_code}</span>
    },
    {
      header: 'Product Name',
      accessor: 'name',
      render: (row) => (
        <div>
          <span className="font-bold text-white block">{row.name}</span>
          <span className="text-xs text-slate-400">{row.category}</span>
        </div>
      )
    },
    {
      header: 'Stock In Hand',
      accessor: 'quantity_available',
      render: (row) => (
        <span className="font-mono font-bold text-white text-sm">
          {parseFloat(row.quantity_available).toLocaleString()} {row.unit_symbol || 'pcs'}
        </span>
      )
    },
    {
      header: 'Production Cost',
      accessor: 'production_cost',
      render: (row) => <span className="font-mono text-slate-300">Rs. {parseFloat(row.production_cost).toLocaleString()}</span>
    },
    {
      header: 'Selling Price',
      accessor: 'selling_price',
      render: (row) => <span className="font-mono font-bold text-emerald-400">Rs. {parseFloat(row.selling_price).toLocaleString()}</span>
    },
    {
      header: 'Unit Margin',
      accessor: 'unit_margin',
      render: (row) => {
        const cost = parseFloat(row.production_cost || 0);
        const price = parseFloat(row.selling_price || 0);
        const margin = price - cost;
        const pct = price > 0 ? (margin / price) * 100 : 0;
        return (
          <span className="font-mono text-xs font-semibold text-cyan-400">
            Rs. {margin.toFixed(0)} ({pct.toFixed(0)}%)
          </span>
        );
      }
    },
    {
      header: 'Total Inventory Valuation',
      accessor: 'total_inventory_cost',
      render: (row) => (
        <span className="font-mono font-bold text-slate-200">
          Rs. {parseFloat(row.total_inventory_cost || 0).toLocaleString()}
        </span>
      )
    },
    {
      header: 'Actions',
      sortable: false,
      render: (row) => (
        <button onClick={() => handleDelete(row)} className="p-1.5 rounded-lg bg-slate-800 hover:bg-rose-900/50 text-rose-400 transition-colors" title="Delete Finished Product">
          <Trash2 className="w-4 h-4" />
        </button>
      )
    }
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-extrabold text-white tracking-tight">Finished Goods Inventory</h2>
          <p className="text-xs text-slate-400">Ready-to-sell finished garments and stitched collections catalog.</p>
        </div>

        <button
          onClick={handleOpenAdd}
          className="inline-flex items-center gap-2 px-4 py-2.5 bg-gradient-to-r from-brand-600 to-brand-700 hover:from-brand-500 hover:to-brand-600 text-white rounded-xl text-xs font-bold shadow-lg shadow-brand-900/40 transition-all"
        >
          <Plus className="w-4 h-4" />
          <span>Add Finished Product</span>
        </button>
      </div>

      {/* Table */}
      <DataTable
        columns={columns}
        data={products}
        loading={loading}
        searchPlaceholder="Search finished goods by name or SKU..."
      />

      {/* Add Product Modal */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title="Add Finished Product to Catalog"
        subtitle="Specify product SKU, category classification, standard manufacturing cost, and retail selling price."
      >
        <form onSubmit={handleSubmit} className="space-y-4 text-xs">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block font-semibold text-slate-300 mb-1">Product Code *</label>
              <input
                type="text"
                required
                value={formData.product_code}
                onChange={(e) => setFormData({ ...formData, product_code: e.target.value })}
                className="w-full bg-slate-950 border border-slate-700/80 rounded-xl px-3 py-2 text-white font-mono focus:border-brand-500 focus:outline-none"
              />
            </div>
            <div>
              <label className="block font-semibold text-slate-300 mb-1">Product Name *</label>
              <input
                type="text"
                required
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                className="w-full bg-slate-950 border border-slate-700/80 rounded-xl px-3 py-2 text-white focus:border-brand-500 focus:outline-none"
                placeholder="e.g. Men Casual Printed Shirt (Slim Fit)"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block font-semibold text-slate-300 mb-1">Garment Category</label>
              <select
                value={formData.category}
                onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                className="w-full bg-slate-950 border border-slate-700/80 rounded-xl px-3 py-2 text-white focus:border-brand-500 focus:outline-none"
              >
                  {categories.map((category) => <option key={category.id} value={category.name}>{category.name}</option>)}
              </select>
            </div>

            <div>
              <label className="block font-semibold text-slate-300 mb-1">Unit *</label>
              <select
                required
                value={formData.unit_id}
                onChange={(e) => setFormData({ ...formData, unit_id: e.target.value })}
                className="w-full bg-slate-950 border border-slate-700/80 rounded-xl px-3 py-2 text-white focus:border-brand-500 focus:outline-none"
              >
                {units.map((u) => (
                  <option key={u.id} value={u.id}>
                    {u.name} ({u.symbol})
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="mt-2 border-t border-slate-800 pt-3">
            <div className="flex items-center justify-between mb-2">
              <label className="block font-semibold text-slate-300">Manage Garment Categories</label>
              <Settings2 className="w-4 h-4 text-slate-500" />
            </div>
            <div className="flex gap-2">
              <input
                value={categoryName}
                onChange={(e) => setCategoryName(e.target.value)}
                placeholder="Enter your category name"
                className="flex-1 bg-slate-950 border border-slate-700/80 rounded-xl px-3 py-2 text-white focus:border-brand-500 focus:outline-none"
              />
              <button type="button" onClick={saveCategory} className="px-3 py-2 rounded-xl bg-brand-600 text-white font-bold">{editingCategory ? 'Update' : 'Add'}</button>
            </div>
            <div className="flex flex-wrap gap-2 mt-2">
              {categories.map((category) => (
                <div key={category.id} className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-slate-800 text-slate-300">
                  <button type="button" onClick={() => { setEditingCategory(category); setCategoryName(category.name); }} className="inline-flex items-center gap-1 hover:text-white">{category.name}<Pencil className="w-3 h-3" /></button>
                  <button type="button" onClick={() => deleteCategory(category)} className="text-rose-400 hover:text-rose-300" title="Delete Category"><Trash2 className="w-3 h-3" /></button>
                </div>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block font-semibold text-slate-300 mb-1">Standard Production Cost (Rs.)</label>
              <input
                type="number"
                step="0.01"
                value={formData.production_cost}
                onChange={(e) => setFormData({ ...formData, production_cost: e.target.value })}
                className="w-full bg-slate-950 border border-slate-700/80 rounded-xl px-3 py-2 text-white font-mono focus:border-brand-500 focus:outline-none"
              />
            </div>
            <div>
              <label className="block font-semibold text-slate-300 mb-1">Selling Price (Rs.)</label>
              <input
                type="number"
                step="0.01"
                value={formData.selling_price}
                onChange={(e) => setFormData({ ...formData, selling_price: e.target.value })}
                className="w-full bg-slate-950 border border-slate-700/80 rounded-xl px-3 py-2 text-white font-mono font-bold text-emerald-400 focus:border-brand-500 focus:outline-none"
              />
            </div>
          </div>

          <div>
            <label className="block font-semibold text-slate-300 mb-1">Description</label>
            <textarea
              rows="2"
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              className="w-full bg-slate-950 border border-slate-700/80 rounded-xl px-3 py-2 text-white focus:border-brand-500 focus:outline-none"
              placeholder="Product design notes and fabric specifications..."
            ></textarea>
          </div>

          <div className="flex justify-end gap-3 pt-4 border-t border-slate-800">
            <button
              type="button"
              onClick={() => setIsModalOpen(false)}
              className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl font-medium"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="px-5 py-2 bg-brand-600 hover:bg-brand-500 text-white font-bold rounded-xl shadow-lg shadow-brand-600/30"
            >
              {submitting ? 'Saving...' : 'Add Finished Product'}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
}

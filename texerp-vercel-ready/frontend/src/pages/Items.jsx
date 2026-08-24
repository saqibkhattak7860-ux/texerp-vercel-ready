import React, { useState, useEffect } from 'react';
import api from '../services/api';
import DataTable from '../components/common/DataTable';
import Modal from '../components/common/Modal';
import Badge from '../components/common/Badge';
import { Plus, Layers, AlertCircle, Eye, Edit, Pencil, Settings2, Trash2, ArrowRight } from 'lucide-react';
import { useNotification } from '../context/NotificationContext';

export default function Items() {
  const [items, setItems] = useState([]);
  const [categories, setCategories] = useState([]);
  const [units, setUnits] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isDetailOpen, setIsDetailOpen] = useState(false);
  const [selectedItem, setSelectedItem] = useState(null);
  const [itemDetails, setItemDetails] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [categoryName, setCategoryName] = useState('');
  const [editingCategory, setEditingCategory] = useState(null);
  const { showToast } = useNotification();

  const [formData, setFormData] = useState({
    item_code: '',
    name: '',
    category_id: '',
    unit_id: '',
    min_stock_level: '100',
    purchase_price: '0',
    selling_price: '0',
    opening_stock: '0',
    description: ''
  });

  const fetchData = async () => {
    setLoading(true);
    try {
      const [itemsRes, catsRes, unitsRes] = await Promise.all([
        api.get('/items'),
        api.get('/categories'),
        api.get('/units')
      ]);
      if (itemsRes.data?.success) setItems(itemsRes.data.data);
      if (catsRes.data?.success) setCategories(catsRes.data.data);
      if (unitsRes.data?.success) setUnits(unitsRes.data.data);
    } catch (err) {
      showToast('Failed to load items', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleOpenAdd = () => {
    setSelectedItem(null);
    setFormData({
      item_code: `ITM-${Date.now().toString().slice(-4)}`,
      name: '',
      category_id: categories[0]?.id || '',
      unit_id: units[0]?.id || '',
      min_stock_level: '100',
      purchase_price: '0',
      selling_price: '0',
      opening_stock: '0',
      description: ''
    });
    setIsModalOpen(true);
  };

  const handleOpenEdit = (item) => {
    setSelectedItem(item);
    setFormData({
      item_code: item.item_code,
      name: item.name,
      category_id: item.category_id,
      unit_id: item.unit_id,
      min_stock_level: item.min_stock_level,
      purchase_price: item.purchase_price,
      selling_price: item.selling_price,
      description: item.description || ''
    });
    setIsModalOpen(true);
  };

  const saveCategory = async () => {
    const name = categoryName.trim();
    if (!name) return;
    try {
      if (editingCategory) {
        const res = await api.put(`/categories/${editingCategory.id}`, { name, code: editingCategory.code, description: editingCategory.description });
        if (res.data?.success) setFormData((current) => current.category_id === editingCategory.id ? { ...current, category_id: editingCategory.id } : current);
      } else {
        const res = await api.post('/categories', { name });
        if (res.data?.success) setFormData((current) => ({ ...current, category_id: res.data.data.id }));
      }
      setCategoryName('');
      setEditingCategory(null);
      await fetchData();
      showToast('Item category saved successfully');
    } catch (err) {
      showToast(err.response?.data?.message || err.message, 'error');
    }
  };

  const deleteCategory = async (category) => {
    if (!window.confirm(`Delete item category "${category.name}"?`)) return;
    try {
      await api.delete(`/categories/${category.id}`);
      if (editingCategory?.id === category.id) {
        setEditingCategory(null);
        setCategoryName('');
      }
      fetchData();
      showToast('Item category deleted successfully');
    } catch (err) {
      showToast(err.response?.data?.message || err.message, 'error');
    }
  };

  const handleViewDetails = async (item) => {
    try {
      const res = await api.get(`/items/${item.id}`);
      if (res.data?.success) {
        setItemDetails(res.data.data);
        setIsDetailOpen(true);
      }
    } catch (err) {
      showToast('Failed to load item stock breakdown', 'error');
    }
  };

  const handleDelete = async (item) => {
    if (!window.confirm(`Delete item "${item.name}"?`)) return;
    try {
      await api.delete(`/items/${item.id}`);
      showToast('Item deleted successfully');
      fetchData();
    } catch (err) {
      showToast(err.response?.data?.message || err.message, 'error');
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      if (selectedItem) {
        await api.put(`/items/${selectedItem.id}`, formData);
        showToast('Item updated successfully');
      } else {
        await api.post('/items', formData);
        showToast('Item created with opening stock');
      }
      setIsModalOpen(false);
      fetchData();
    } catch (err) {
      showToast(err.response?.data?.message || err.message, 'error');
    } finally {
      setSubmitting(false);
    }
  };

  const columns = [
    {
      header: 'Item Code',
      accessor: 'item_code',
      render: (row) => <span className="font-mono font-semibold text-brand-400">{row.item_code}</span>
    },
    {
      header: 'Item Name',
      accessor: 'name',
      render: (row) => (
        <div>
          <span className="font-bold text-white block">{row.name}</span>
          <span className="text-xs text-slate-400">{row.description || '—'}</span>
        </div>
      )
    },
    {
      header: 'Category',
      accessor: 'category_name',
      render: (row) => <Badge variant={row.category_name} />
    },
    {
      header: 'Current Stock',
      accessor: 'current_stock',
      render: (row) => (
        <div className="flex items-center gap-2">
          <span className={`font-mono font-bold ${row.is_low_stock ? 'text-amber-400' : 'text-slate-200'}`}>
            {parseFloat(row.current_stock).toLocaleString()} {row.unit_symbol}
          </span>
          {row.is_low_stock && (
            <span className="px-1.5 py-0.5 text-[10px] font-bold bg-amber-500/20 text-amber-400 border border-amber-500/30 rounded">
              Low
            </span>
          )}
        </div>
      )
    },
    {
      header: 'Purchase Rate',
      accessor: 'purchase_price',
      render: (row) => <span className="font-mono">Rs. {parseFloat(row.purchase_price).toLocaleString()}</span>
    },
    {
      header: 'Valuation',
      accessor: 'stock_valuation',
      render: (row) => (
        <span className="font-mono font-semibold text-emerald-400">
          Rs. {parseFloat(row.stock_valuation || 0).toLocaleString()}
        </span>
      )
    },
    {
      header: 'Actions',
      sortable: false,
      render: (row) => (
        <div className="flex items-center gap-2">
          <button
            onClick={() => handleViewDetails(row)}
            className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 transition-colors"
            title="View Stock Breakdown"
          >
            <Eye className="w-4 h-4" />
          </button>
          <button
            onClick={() => handleOpenEdit(row)}
            className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-brand-400 transition-colors"
            title="Edit Item"
          >
            <Edit className="w-4 h-4" />
          </button>
          <button onClick={() => handleDelete(row)} className="p-1.5 rounded-lg bg-slate-800 hover:bg-rose-900/50 text-rose-400 transition-colors" title="Delete Item">
            <Trash2 className="w-4 h-4" />
          </button>
        </div>
      )
    }
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-extrabold text-white tracking-tight">Item Master Catalog</h2>
          <p className="text-xs text-slate-400">Manage textile raw materials, printed fabrics, threads, trims & inventory rates.</p>
        </div>

        <button
          onClick={handleOpenAdd}
          className="inline-flex items-center gap-2 px-4 py-2.5 bg-gradient-to-r from-brand-600 to-brand-700 hover:from-brand-500 hover:to-brand-600 text-white rounded-xl text-xs font-bold shadow-lg shadow-brand-900/40 transition-all"
        >
          <Plus className="w-4 h-4" />
          <span>Add New Item</span>
        </button>
      </div>

      {/* Table */}
      <DataTable
        columns={columns}
        data={items}
        loading={loading}
        searchPlaceholder="Search by item name or code..."
        filters={[
          {
            key: 'category_name',
            label: 'All Categories',
            options: categories.map((c) => ({ label: c.name, value: c.name }))
          }
        ]}
      />

      {/* Add/Edit Item Modal */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title={selectedItem ? 'Edit Item Details' : 'Create New Inventory Item'}
        subtitle="Specify item classification, unit measurement, reorder thresholds, and pricing."
      >
        <form onSubmit={handleSubmit} className="space-y-4 text-xs">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block font-semibold text-slate-300 mb-1">Item Code *</label>
              <input
                type="text"
                required
                value={formData.item_code}
                onChange={(e) => setFormData({ ...formData, item_code: e.target.value })}
                className="w-full bg-slate-950 border border-slate-700/80 rounded-xl px-3 py-2 text-white font-mono focus:border-brand-500 focus:outline-none"
              />
            </div>
            <div>
              <label className="block font-semibold text-slate-300 mb-1">Item Name *</label>
              <input
                type="text"
                required
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                className="w-full bg-slate-950 border border-slate-700/80 rounded-xl px-3 py-2 text-white focus:border-brand-500 focus:outline-none"
                placeholder="e.g. Cotton Cambric 60s"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block font-semibold text-slate-300 mb-1">Category *</label>
              <select
                required
                value={formData.category_id}
                onChange={(e) => setFormData({ ...formData, category_id: e.target.value })}
                className="w-full bg-slate-950 border border-slate-700/80 rounded-xl px-3 py-2 text-white focus:border-brand-500 focus:outline-none"
              >
                <option value="">Select Category</option>
                {categories.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>
            </div>
            <div className="sm:col-span-2 border-t border-slate-800 pt-3">
              <div className="flex items-center justify-between mb-2">
                <label className="block font-semibold text-slate-300">Manage Item Categories</label>
                <Settings2 className="w-4 h-4 text-slate-500" />
              </div>
              <div className="flex gap-2">
                <input
                  value={categoryName}
                  onChange={(e) => setCategoryName(e.target.value)}
                  placeholder="Enter your item category"
                  className="flex-1 bg-slate-950 border border-slate-700/80 rounded-xl px-3 py-2 text-white focus:border-brand-500 focus:outline-none"
                />
                <button type="button" onClick={saveCategory} className="px-3 py-2 rounded-xl bg-brand-600 text-white font-bold">
                  {editingCategory ? 'Update' : 'Add'}
                </button>
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
            <div>
              <label className="block font-semibold text-slate-300 mb-1">Measurement Unit *</label>
              <select
                required
                value={formData.unit_id}
                onChange={(e) => setFormData({ ...formData, unit_id: e.target.value })}
                className="w-full bg-slate-950 border border-slate-700/80 rounded-xl px-3 py-2 text-white focus:border-brand-500 focus:outline-none"
              >
                <option value="">Select Unit</option>
                {units.map((u) => (
                  <option key={u.id} value={u.id}>
                    {u.name} ({u.symbol})
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <label className="block font-semibold text-slate-300 mb-1">Purchase Price (Rs.)</label>
              <input
                type="number"
                step="0.01"
                value={formData.purchase_price}
                onChange={(e) => setFormData({ ...formData, purchase_price: e.target.value })}
                className="w-full bg-slate-950 border border-slate-700/80 rounded-xl px-3 py-2 text-white font-mono focus:border-brand-500 focus:outline-none"
              />
            </div>
            <div>
              <label className="block font-semibold text-slate-300 mb-1">Min Stock Warning Level</label>
              <input
                type="number"
                value={formData.min_stock_level}
                onChange={(e) => setFormData({ ...formData, min_stock_level: e.target.value })}
                className="w-full bg-slate-950 border border-slate-700/80 rounded-xl px-3 py-2 text-white font-mono focus:border-brand-500 focus:outline-none"
              />
            </div>
            {!selectedItem && (
              <div>
                <label className="block font-semibold text-slate-300 mb-1">Opening Stock Qty</label>
                <input
                  type="number"
                  value={formData.opening_stock}
                  onChange={(e) => setFormData({ ...formData, opening_stock: e.target.value })}
                  className="w-full bg-slate-950 border border-slate-700/80 rounded-xl px-3 py-2 text-white font-mono focus:border-brand-500 focus:outline-none"
                />
              </div>
            )}
          </div>

          <div>
            <label className="block font-semibold text-slate-300 mb-1">Description / Composition</label>
            <textarea
              rows="2"
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              className="w-full bg-slate-950 border border-slate-700/80 rounded-xl px-3 py-2 text-white focus:border-brand-500 focus:outline-none"
              placeholder="Fabric construction, yarn counts, or vendor specifications..."
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
              {submitting ? 'Saving...' : selectedItem ? 'Update Item' : 'Create Item'}
            </button>
          </div>
        </form>
      </Modal>

      {/* Multi-Location Stock Inspector Modal */}
      <Modal
        isOpen={isDetailOpen}
        onClose={() => setIsDetailOpen(false)}
        title={itemDetails?.name || 'Stock Movement Inspector'}
        subtitle={`SKU: ${itemDetails?.item_code} | Category: ${itemDetails?.category_name}`}
        maxWidth="max-w-3xl"
      >
        {itemDetails && (
          <div className="space-y-6 text-xs">
            {/* Total Balance & Valuation Card */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 bg-slate-950 p-4 rounded-xl border border-slate-800">
              <div>
                <span className="text-slate-400 font-semibold uppercase tracking-wider block">Total Available Stock</span>
                <span className="text-xl font-bold text-white font-mono mt-1 block">
                  {parseFloat(itemDetails.current_stock).toLocaleString()} {itemDetails.unit_symbol}
                </span>
              </div>
              <div>
                <span className="text-slate-400 font-semibold uppercase tracking-wider block">Unit Cost Rate</span>
                <span className="text-xl font-bold text-blue-400 font-mono mt-1 block">
                  Rs. {parseFloat(itemDetails.purchase_price).toLocaleString()}
                </span>
              </div>
              <div>
                <span className="text-slate-400 font-semibold uppercase tracking-wider block">Total Asset Valuation</span>
                <span className="text-xl font-bold text-emerald-400 font-mono mt-1 block">
                  Rs. {(parseFloat(itemDetails.current_stock) * parseFloat(itemDetails.purchase_price)).toLocaleString()}
                </span>
              </div>
            </div>

            {/* Location-Wise Balance Grid */}
            <div>
              <h4 className="font-bold text-white mb-2 uppercase tracking-wider text-[11px]">
                Warehouse & Factory Location Breakdown
              </h4>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                {itemDetails.locations?.map((loc) => (
                  <div key={loc.warehouse_id} className="p-3 rounded-xl bg-slate-850 border border-slate-800">
                    <p className="font-semibold text-slate-300 truncate">{loc.warehouse_name}</p>
                    <p className="text-[10px] text-slate-500">{loc.warehouse_type}</p>
                    <p className="text-sm font-bold font-mono text-white mt-1">
                      {parseFloat(loc.quantity).toLocaleString()} {itemDetails.unit_symbol}
                    </p>
                  </div>
                ))}
              </div>
            </div>

            {/* Movement Ledger */}
            <div>
              <h4 className="font-bold text-white mb-2 uppercase tracking-wider text-[11px]">
                Recent Movement Audit Trail
              </h4>
              <div className="max-h-56 overflow-y-auto rounded-xl border border-slate-800 divide-y divide-slate-800 bg-slate-950">
                {itemDetails.movements?.length > 0 ? (
                  itemDetails.movements.map((m) => (
                    <div key={m.id} className="p-3 flex items-center justify-between">
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-semibold text-white">{m.movement_type}</span>
                          <span className="text-slate-400 font-mono text-[10px]">({m.reference_number || 'Direct'})</span>
                        </div>
                        <p className="text-slate-400 text-[11px] mt-0.5">
                          From: <span className="text-slate-300">{m.from_warehouse_name || 'External'}</span> → To:{' '}
                          <span className="text-slate-300">{m.to_warehouse_name || 'Dispatched'}</span>
                        </p>
                      </div>
                      <div className="text-right">
                        <span className="font-bold text-emerald-400 font-mono">
                          {parseFloat(m.quantity).toLocaleString()} {itemDetails.unit_symbol}
                        </span>
                        <span className="block text-[10px] text-slate-500">
                          {new Date(m.created_at).toLocaleDateString()}
                        </span>
                      </div>
                    </div>
                  ))
                ) : (
                  <p className="p-4 text-center text-slate-500">No stock movements recorded for this item.</p>
                )}
              </div>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}

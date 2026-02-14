import React, { useState, useEffect } from 'react';
import {
  Building2, Users, Plus, Edit, Trash2, Eye, RefreshCw, X, Save,
  TrendingUp, Clock, AlertTriangle, CheckCircle2, UserCheck, Shield,
  CreditCard, Monitor, HardDrive, FileText, Star
} from 'lucide-react';
import { superAdminService } from '../services/superadmin.service';
import { upgradeService } from '../services/upgrade.service';
import { Organization, Employee, PlatformStats, User, UpgradeRequest } from '../types';
import AdManagement from '../components/superadmin/AdManagement';
import StorageManagement from '../components/superadmin/StorageManagement';
import BlogManagement from '../components/superadmin/BlogManagement';
import ShowcaseManagement from '../components/superadmin/ShowcaseManagement';

interface SuperAdminProps {
  user: User;
  onNavigate: (path: string) => void;
}

type ViewMode = 'list' | 'create' | 'edit' | 'users';
type TabMode = 'organizations' | 'requests' | 'ads' | 'storage' | 'blog' | 'showcase';

const SuperAdmin: React.FC<SuperAdminProps> = () => {
  const [activeTab, setActiveTab] = useState<TabMode>('organizations');
  const [organizations, setOrganizations] = useState<Organization[]>([]);
  const [stats, setStats] = useState<PlatformStats | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [viewMode, setViewMode] = useState<ViewMode>('list');
  const [selectedOrg, setSelectedOrg] = useState<Organization | null>(null);
  const [orgUsers, setOrgUsers] = useState<Employee[]>([]);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Upgrade requests state
  const [upgradeRequests, setUpgradeRequests] = useState<UpgradeRequest[]>([]);
  const [requestsFilter, setRequestsFilter] = useState<'PENDING' | 'APPROVED' | 'REJECTED' | ''>('PENDING');

  // Form state
  const [formData, setFormData] = useState({
    name: '',
    address: '',
    subscriptionStatus: 'TRIAL',
    trialEndDate: '',
    adminName: '',
    adminEmail: '',
    adminPassword: ''
  });

  useEffect(() => {
    loadData();
    // Also load upgrade requests count for badge
    loadUpgradeRequests();
  }, []);

  const loadData = async () => {
    setIsLoading(true);
    const [orgsData, statsData] = await Promise.all([
      superAdminService.getAllOrganizations(),
      superAdminService.getPlatformStats()
    ]);
    setOrganizations(orgsData);
    setStats(statsData);
    setIsLoading(false);
  };

  const loadUpgradeRequests = async () => {
    const requests = await upgradeService.getAllRequests(requestsFilter);
    setUpgradeRequests(requests);
  };

  useEffect(() => {
    if (activeTab === 'requests') {
      loadUpgradeRequests();
    }
  }, [activeTab, requestsFilter]);

  const handleProcessRequest = async (requestId: string, action: 'APPROVED' | 'REJECTED', notes?: string, days?: number) => {
    setIsLoading(true);
    const result = await upgradeService.processRequest(requestId, action, notes, days);
    if (result.success) {
      setMessage({ type: 'success', text: result.message });
      await loadUpgradeRequests();
    } else {
      setMessage({ type: 'error', text: result.message });
    }
    setIsLoading(false);
  };

  const handleCreateOrg = async () => {
    if (!formData.name || !formData.adminName || !formData.adminEmail || !formData.adminPassword) {
      setMessage({ type: 'error', text: 'Please fill in all required fields' });
      return;
    }

    if (formData.adminPassword.length < 8) {
      setMessage({ type: 'error', text: 'Password must be at least 8 characters' });
      return;
    }

    setIsLoading(true);
    const result = await superAdminService.createOrganization(formData);

    if (result.success) {
      setMessage({ type: 'success', text: result.message });
      setViewMode('list');
      setFormData({ name: '', address: '', subscriptionStatus: 'TRIAL', trialEndDate: '', adminName: '', adminEmail: '', adminPassword: '' });
      await loadData();
    } else {
      setMessage({ type: 'error', text: result.message });
    }
    setIsLoading(false);
  };

  const handleUpdateOrg = async () => {
    if (!selectedOrg) return;

    setIsLoading(true);
    const result = await superAdminService.updateOrganization(selectedOrg.id, {
      name: formData.name,
      address: formData.address,
      subscriptionStatus: formData.subscriptionStatus as any,
      trialEndDate: formData.trialEndDate || undefined
    });

    if (result.success) {
      setMessage({ type: 'success', text: result.message });
      setViewMode('list');
      setSelectedOrg(null);
      await loadData();
    } else {
      setMessage({ type: 'error', text: result.message });
    }
    setIsLoading(false);
  };

  const handleDeleteOrg = async (org: Organization) => {
    if (!confirm(`Are you sure you want to delete "${org.name}"?\n\nThis will permanently delete:\n- All users (${org.userCount || 0})\n- All attendance records\n- All leave records\n- All settings\n\nThis action cannot be undone!`)) {
      return;
    }

    setIsLoading(true);
    const result = await superAdminService.deleteOrganization(org.id);

    if (result.success) {
      setMessage({ type: 'success', text: result.message });
      await loadData();
    } else {
      setMessage({ type: 'error', text: result.message });
    }
    setIsLoading(false);
  };

  const handleViewUsers = async (org: Organization) => {
    setSelectedOrg(org);
    setIsLoading(true);
    const users = await superAdminService.getOrganizationUsers(org.id);
    setOrgUsers(users);
    setViewMode('users');
    setIsLoading(false);
  };

  const handleVerifyUser = async (userId: string) => {
    const result = await superAdminService.verifyUser(userId);
    if (result.success) {
      setMessage({ type: 'success', text: 'User verified successfully' });
      if (selectedOrg) {
        const users = await superAdminService.getOrganizationUsers(selectedOrg.id);
        setOrgUsers(users);
      }
    } else {
      setMessage({ type: 'error', text: result.message });
    }
  };

  const handleDeleteUser = async (userId: string, userName: string) => {
    if (!confirm(`Are you sure you want to delete user "${userName}"? This action cannot be undone.`)) {
      return;
    }

    const result = await superAdminService.deleteUser(userId);
    if (result.success) {
      setMessage({ type: 'success', text: 'User deleted successfully' });
      if (selectedOrg) {
        const users = await superAdminService.getOrganizationUsers(selectedOrg.id);
        setOrgUsers(users);
      }
    } else {
      setMessage({ type: 'error', text: result.message });
    }
  };

  const openEditMode = (org: Organization) => {
    setSelectedOrg(org);
    // Format trial end date for input (YYYY-MM-DD)
    let trialEndDateFormatted = '';
    if (org.trialEndDate) {
      try {
        trialEndDateFormatted = new Date(org.trialEndDate).toISOString().split('T')[0];
      } catch {
        trialEndDateFormatted = '';
      }
    }
    setFormData({
      name: org.name,
      address: org.address || '',
      subscriptionStatus: org.subscriptionStatus || 'TRIAL',
      trialEndDate: trialEndDateFormatted,
      adminName: '',
      adminEmail: '',
      adminPassword: ''
    });
    setViewMode('edit');
  };

  const openCreateMode = () => {
    // Default trial end date to 14 days from now
    const defaultTrialEnd = new Date();
    defaultTrialEnd.setDate(defaultTrialEnd.getDate() + 14);
    setFormData({
      name: '',
      address: '',
      subscriptionStatus: 'TRIAL',
      trialEndDate: defaultTrialEnd.toISOString().split('T')[0],
      adminName: '',
      adminEmail: '',
      adminPassword: ''
    });
    setViewMode('create');
  };

  const getStatusBadge = (status: string) => {
    const styles: Record<string, string> = {
      ACTIVE: 'bg-emerald-100 text-emerald-700',
      TRIAL: 'bg-amber-100 text-amber-700',
      EXPIRED: 'bg-red-100 text-red-700',
      SUSPENDED: 'bg-slate-100 text-slate-700'
    };
    return styles[status] || styles.TRIAL;
  };

  // Clear message after 5 seconds
  useEffect(() => {
    if (message) {
      const timer = setTimeout(() => setMessage(null), 5000);
      return () => clearTimeout(timer);
    }
  }, [message]);

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-black text-slate-900 tracking-tight flex items-center gap-3">
            <Shield className="text-primary" size={32} />
            Super Admin Dashboard
          </h1>
          <p className="text-slate-500 mt-1">Manage all organizations on the platform</p>
        </div>
        {activeTab === 'organizations' && viewMode === 'list' && (
          <button
            onClick={openCreateMode}
            className="px-6 py-3 bg-primary text-white rounded-2xl font-bold flex items-center gap-2 hover:bg-primary-hover transition-all shadow-lg"
          >
            <Plus size={20} /> New Organization
          </button>
        )}
        {activeTab === 'organizations' && viewMode !== 'list' && (
          <button
            onClick={() => { setViewMode('list'); setSelectedOrg(null); }}
            className="px-6 py-3 bg-slate-100 text-slate-700 rounded-2xl font-bold flex items-center gap-2 hover:bg-slate-200 transition-all"
          >
            <X size={20} /> Back to List
          </button>
        )}
      </div>

      {/* Message */}
      {message && (
        <div className={`p-4 rounded-2xl flex items-center gap-3 ${message.type === 'success' ? 'bg-emerald-50 text-emerald-700' : 'bg-red-50 text-red-700'}`}>
          {message.type === 'success' ? <CheckCircle2 size={20} /> : <AlertTriangle size={20} />}
          <span className="font-medium">{message.text}</span>
        </div>
      )}

      {/* Main Tabs */}
      <div className="flex gap-2 p-1 bg-slate-100 rounded-xl">
        <button
          onClick={() => { setActiveTab('organizations'); setViewMode('list'); }}
          className={`flex-1 py-3 px-4 rounded-lg font-bold text-sm transition-all flex items-center justify-center gap-2 ${
            activeTab === 'organizations' ? 'bg-white text-primary shadow-sm' : 'text-slate-500 hover:text-slate-700'
          }`}
        >
          <Building2 size={18} /> Organizations
        </button>
        <button
          onClick={() => setActiveTab('requests')}
          className={`flex-1 py-3 px-4 rounded-lg font-bold text-sm transition-all flex items-center justify-center gap-2 ${
            activeTab === 'requests' ? 'bg-white text-primary shadow-sm' : 'text-slate-500 hover:text-slate-700'
          }`}
        >
          <CreditCard size={18} /> Upgrade Requests
          {upgradeRequests.filter(r => r.status === 'PENDING').length > 0 && (
            <span className="px-2 py-0.5 bg-red-500 text-white text-xs rounded-full">
              {upgradeRequests.filter(r => r.status === 'PENDING').length}
            </span>
          )}
        </button>
        <button
          onClick={() => setActiveTab('ads')}
          className={`flex-1 py-3 px-4 rounded-lg font-bold text-sm transition-all flex items-center justify-center gap-2 ${
            activeTab === 'ads' ? 'bg-white text-primary shadow-sm' : 'text-slate-500 hover:text-slate-700'
          }`}
        >
          <Monitor size={18} /> Ad Management
        </button>
        <button
          onClick={() => setActiveTab('storage')}
          className={`flex-1 py-3 px-4 rounded-lg font-bold text-sm transition-all flex items-center justify-center gap-2 ${
            activeTab === 'storage' ? 'bg-white text-primary shadow-sm' : 'text-slate-500 hover:text-slate-700'
          }`}
        >
          <HardDrive size={18} /> Storage
        </button>
        <button
          onClick={() => setActiveTab('blog')}
          className={`flex-1 py-3 px-4 rounded-lg font-bold text-sm transition-all flex items-center justify-center gap-2 ${
            activeTab === 'blog' ? 'bg-white text-primary shadow-sm' : 'text-slate-500 hover:text-slate-700'
          }`}
        >
          <FileText size={18} /> Blog
        </button>
        <button
          onClick={() => setActiveTab('showcase')}
          className={`flex-1 py-3 px-4 rounded-lg font-bold text-sm transition-all flex items-center justify-center gap-2 ${
            activeTab === 'showcase' ? 'bg-white text-primary shadow-sm' : 'text-slate-500 hover:text-slate-700'
          }`}
        >
          <Star size={18} /> Showcase
        </button>
      </div>

      {/* Upgrade Requests Tab */}
      {activeTab === 'requests' && (
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <h3 className="text-xl font-bold text-slate-900">Upgrade Requests</h3>
            <div className="flex gap-2">
              {['PENDING', 'APPROVED', 'REJECTED', ''].map(filter => (
                <button
                  key={filter || 'all'}
                  onClick={() => setRequestsFilter(filter as any)}
                  className={`px-4 py-2 rounded-xl text-xs font-bold transition-all ${
                    requestsFilter === filter
                      ? 'bg-primary text-white'
                      : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                  }`}
                >
                  {filter || 'All'}
                </button>
              ))}
            </div>
          </div>

          {isLoading ? (
            <div className="text-center py-12 text-slate-400">Loading...</div>
          ) : upgradeRequests.length === 0 ? (
            <div className="text-center py-12 bg-white rounded-2xl border border-slate-100">
              <CreditCard size={48} className="mx-auto text-slate-300 mb-4" />
              <p className="text-slate-500 font-medium">No upgrade requests found</p>
            </div>
          ) : (
            <div className="space-y-4">
              {upgradeRequests.map(req => (
                <div key={req.id} className="bg-white rounded-2xl border border-slate-100 p-6">
                  <div className="flex items-start justify-between mb-4">
                    <div>
                      <h4 className="font-bold text-slate-900">{req.organizationName}</h4>
                      <p className="text-sm text-slate-500">
                        {req.requestType === 'DONATION' && `Donation: $${req.donationAmount} (${req.donationTier})`}
                        {req.requestType === 'TRIAL_EXTENSION' && `Extension: ${req.extensionDays} days`}
                        {req.requestType === 'AD_SUPPORTED' && 'Ad-Supported Mode'}
                      </p>
                      {req.donationReference && (
                        <p className="text-xs text-slate-400 mt-1">Ref: {req.donationReference}</p>
                      )}
                      {req.extensionReason && (
                        <p className="text-xs text-slate-400 mt-1">Reason: {req.extensionReason}</p>
                      )}
                    </div>
                    <span className={`px-3 py-1 rounded-full text-xs font-bold ${
                      req.status === 'PENDING' ? 'bg-amber-100 text-amber-700' :
                      req.status === 'APPROVED' ? 'bg-emerald-100 text-emerald-700' :
                      'bg-red-100 text-red-700'
                    }`}>
                      {req.status}
                    </span>
                  </div>

                  {req.status === 'PENDING' && (
                    <div className="flex gap-2 pt-4 border-t border-slate-100">
                      <button
                        onClick={() => handleProcessRequest(req.id, 'APPROVED')}
                        className="flex-1 py-2 bg-emerald-600 text-white rounded-xl font-bold text-sm hover:bg-emerald-700 transition-all"
                      >
                        Approve
                      </button>
                      <button
                        onClick={() => handleProcessRequest(req.id, 'REJECTED')}
                        className="flex-1 py-2 bg-red-100 text-red-700 rounded-xl font-bold text-sm hover:bg-red-200 transition-all"
                      >
                        Reject
                      </button>
                    </div>
                  )}

                  <p className="text-xs text-slate-400 mt-3">
                    Submitted: {new Date(req.created || '').toLocaleString()}
                  </p>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Ad Management Tab */}
      {activeTab === 'ads' && (
        <AdManagement onMessage={setMessage} />
      )}

      {/* Storage Management Tab */}
      {activeTab === 'storage' && (
        <StorageManagement onMessage={setMessage} />
      )}

      {/* Blog Management Tab */}
      {activeTab === 'blog' && (
        <BlogManagement onMessage={setMessage} />
      )}

      {/* Showcase Management Tab */}
      {activeTab === 'showcase' && (
        <ShowcaseManagement onMessage={setMessage} />
      )}

      {/* Organizations Tab - Stats Cards */}
      {activeTab === 'organizations' && viewMode === 'list' && stats && (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
          <div className="bg-white p-5 rounded-2xl border border-slate-100 shadow-sm">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-primary-light rounded-xl">
                <Building2 size={20} className="text-primary" />
              </div>
              <div>
                <p className="text-2xl font-black text-slate-900">{stats.totalOrganizations}</p>
                <p className="text-xs text-slate-500 font-medium">Total Orgs</p>
              </div>
            </div>
          </div>
          <div className="bg-white p-5 rounded-2xl border border-slate-100 shadow-sm">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-blue-100 rounded-xl">
                <Users size={20} className="text-blue-600" />
              </div>
              <div>
                <p className="text-2xl font-black text-slate-900">{stats.totalUsers}</p>
                <p className="text-xs text-slate-500 font-medium">Total Users</p>
              </div>
            </div>
          </div>
          <div className="bg-white p-5 rounded-2xl border border-slate-100 shadow-sm">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-emerald-100 rounded-xl">
                <CheckCircle2 size={20} className="text-emerald-600" />
              </div>
              <div>
                <p className="text-2xl font-black text-slate-900">{stats.activeOrganizations}</p>
                <p className="text-xs text-slate-500 font-medium">Active</p>
              </div>
            </div>
          </div>
          <div className="bg-white p-5 rounded-2xl border border-slate-100 shadow-sm">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-amber-100 rounded-xl">
                <Clock size={20} className="text-amber-600" />
              </div>
              <div>
                <p className="text-2xl font-black text-slate-900">{stats.trialOrganizations}</p>
                <p className="text-xs text-slate-500 font-medium">Trial</p>
              </div>
            </div>
          </div>
          <div className="bg-white p-5 rounded-2xl border border-slate-100 shadow-sm">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-red-100 rounded-xl">
                <AlertTriangle size={20} className="text-red-600" />
              </div>
              <div>
                <p className="text-2xl font-black text-slate-900">{stats.expiredOrganizations}</p>
                <p className="text-xs text-slate-500 font-medium">Expired</p>
              </div>
            </div>
          </div>
          <div className="bg-white p-5 rounded-2xl border border-slate-100 shadow-sm">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-violet-100 rounded-xl">
                <TrendingUp size={20} className="text-violet-600" />
              </div>
              <div>
                <p className="text-2xl font-black text-slate-900">{stats.recentRegistrations}</p>
                <p className="text-xs text-slate-500 font-medium">Last 30d</p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Organization List */}
      {activeTab === 'organizations' && viewMode === 'list' && (
        <div className="bg-white rounded-3xl border border-slate-100 shadow-sm overflow-hidden">
          <div className="p-6 border-b border-slate-100 flex items-center justify-between">
            <h2 className="text-lg font-bold text-slate-900">All Organizations</h2>
            <button onClick={loadData} disabled={isLoading} className="p-2 hover:bg-slate-100 rounded-xl transition-all">
              <RefreshCw size={20} className={`text-slate-500 ${isLoading ? 'animate-spin' : ''}`} />
            </button>
          </div>

          {isLoading ? (
            <div className="p-12 text-center text-slate-500">Loading organizations...</div>
          ) : organizations.length === 0 ? (
            <div className="p-12 text-center text-slate-500">No organizations found</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-slate-50">
                  <tr>
                    <th className="text-left p-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Organization</th>
                    <th className="text-left p-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Status</th>
                    <th className="text-left p-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Users</th>
                    <th className="text-left p-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Admin</th>
                    <th className="text-left p-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Created</th>
                    <th className="text-right p-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {organizations.map((org) => (
                    <tr key={org.id} className="hover:bg-slate-50 transition-colors">
                      <td className="p-4">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 bg-primary-light rounded-xl flex items-center justify-center">
                            <Building2 size={20} className="text-primary" />
                          </div>
                          <div>
                            <p className="font-bold text-slate-900">{org.name}</p>
                            {org.address && <p className="text-xs text-slate-500">{org.address}</p>}
                          </div>
                        </div>
                      </td>
                      <td className="p-4">
                        <div className="flex flex-col gap-1">
                          <span className={`px-3 py-1 rounded-full text-xs font-bold inline-block w-fit ${getStatusBadge(org.subscriptionStatus || 'TRIAL')}`}>
                            {org.subscriptionStatus || 'TRIAL'}
                          </span>
                          {org.subscriptionStatus === 'TRIAL' && org.trialEndDate && (
                            <span className="text-xs text-slate-400">
                              Ends: {new Date(org.trialEndDate).toLocaleDateString()}
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="p-4">
                        <span className="font-bold text-slate-700">{org.userCount || 0}</span>
                      </td>
                      <td className="p-4">
                        <span className="text-sm text-slate-600">{org.adminEmail || '-'}</span>
                      </td>
                      <td className="p-4">
                        <span className="text-sm text-slate-500">
                          {org.created ? new Date(org.created).toLocaleDateString() : '-'}
                        </span>
                      </td>
                      <td className="p-4">
                        <div className="flex items-center justify-end gap-2">
                          <button
                            onClick={() => handleViewUsers(org)}
                            className="p-2 hover:bg-blue-100 rounded-xl transition-all"
                            title="View Users"
                          >
                            <Eye size={18} className="text-blue-600" />
                          </button>
                          <button
                            onClick={() => openEditMode(org)}
                            className="p-2 hover:bg-amber-100 rounded-xl transition-all"
                            title="Edit"
                          >
                            <Edit size={18} className="text-amber-600" />
                          </button>
                          <button
                            onClick={() => handleDeleteOrg(org)}
                            className="p-2 hover:bg-red-100 rounded-xl transition-all"
                            title="Delete"
                          >
                            <Trash2 size={18} className="text-red-600" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* Create/Edit Form */}
      {activeTab === 'organizations' && (viewMode === 'create' || viewMode === 'edit') && (
        <div className="bg-white rounded-3xl border border-slate-100 shadow-sm p-8">
          <h2 className="text-xl font-bold text-slate-900 mb-6">
            {viewMode === 'create' ? 'Create New Organization' : `Edit: ${selectedOrg?.name}`}
          </h2>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-2">
              <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Organization Name *</label>
              <input
                type="text"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl font-medium focus:ring-2 focus:ring-primary-light outline-none"
                placeholder="e.g., Acme Corporation"
              />
            </div>

            <div className="space-y-2">
              <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Subscription Status</label>
              <select
                value={formData.subscriptionStatus}
                onChange={(e) => setFormData({ ...formData, subscriptionStatus: e.target.value })}
                className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl font-medium focus:ring-2 focus:ring-primary-light outline-none"
              >
                <option value="TRIAL">Trial</option>
                <option value="ACTIVE">Active</option>
                <option value="EXPIRED">Expired</option>
                <option value="SUSPENDED">Suspended</option>
              </select>
            </div>

            {formData.subscriptionStatus === 'TRIAL' && (
              <div className="space-y-2">
                <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Trial End Date</label>
                <input
                  type="date"
                  value={formData.trialEndDate}
                  onChange={(e) => setFormData({ ...formData, trialEndDate: e.target.value })}
                  className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl font-medium focus:ring-2 focus:ring-primary-light outline-none"
                />
                <p className="text-xs text-slate-400">Organization will auto-expire after this date</p>
              </div>
            )}

            <div className={`space-y-2 ${formData.subscriptionStatus === 'TRIAL' ? '' : 'md:col-span-2'}`}>
              <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Address</label>
              <input
                type="text"
                value={formData.address}
                onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl font-medium focus:ring-2 focus:ring-primary-light outline-none"
                placeholder="e.g., 123 Business Street, City"
              />
            </div>

            {viewMode === 'create' && (
              <>
                <div className="md:col-span-2 border-t border-slate-100 pt-6 mt-2">
                  <h3 className="font-bold text-slate-700 mb-4">Initial Admin Account</h3>
                </div>

                <div className="space-y-2">
                  <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Admin Name *</label>
                  <input
                    type="text"
                    value={formData.adminName}
                    onChange={(e) => setFormData({ ...formData, adminName: e.target.value })}
                    className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl font-medium focus:ring-2 focus:ring-primary-light outline-none"
                    placeholder="e.g., John Smith"
                  />
                </div>

                <div className="space-y-2">
                  <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Admin Email *</label>
                  <input
                    type="email"
                    value={formData.adminEmail}
                    onChange={(e) => setFormData({ ...formData, adminEmail: e.target.value })}
                    className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl font-medium focus:ring-2 focus:ring-primary-light outline-none"
                    placeholder="e.g., admin@company.com"
                  />
                </div>

                <div className="space-y-2">
                  <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Admin Password *</label>
                  <input
                    type="password"
                    value={formData.adminPassword}
                    onChange={(e) => setFormData({ ...formData, adminPassword: e.target.value })}
                    className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl font-medium focus:ring-2 focus:ring-primary-light outline-none"
                    placeholder="Min. 8 characters"
                  />
                </div>
              </>
            )}
          </div>

          <div className="flex justify-end gap-4 mt-8 pt-6 border-t border-slate-100">
            <button
              onClick={() => { setViewMode('list'); setSelectedOrg(null); }}
              className="px-6 py-3 bg-slate-100 text-slate-700 rounded-xl font-bold hover:bg-slate-200 transition-all"
            >
              Cancel
            </button>
            <button
              onClick={viewMode === 'create' ? handleCreateOrg : handleUpdateOrg}
              disabled={isLoading}
              className="px-6 py-3 bg-primary text-white rounded-xl font-bold flex items-center gap-2 hover:bg-primary-hover transition-all disabled:opacity-50"
            >
              <Save size={18} />
              {viewMode === 'create' ? 'Create Organization' : 'Save Changes'}
            </button>
          </div>
        </div>
      )}

      {/* Users View */}
      {activeTab === 'organizations' && viewMode === 'users' && selectedOrg && (
        <div className="bg-white rounded-3xl border border-slate-100 shadow-sm overflow-hidden">
          <div className="p-6 border-b border-slate-100">
            <h2 className="text-lg font-bold text-slate-900">
              Users in {selectedOrg.name}
            </h2>
            <p className="text-sm text-slate-500">{orgUsers.length} users</p>
          </div>

          {isLoading ? (
            <div className="p-12 text-center text-slate-500">Loading users...</div>
          ) : orgUsers.length === 0 ? (
            <div className="p-12 text-center text-slate-500">No users found</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-slate-50">
                  <tr>
                    <th className="text-left p-4 text-xs font-bold text-slate-500 uppercase tracking-wider">User</th>
                    <th className="text-left p-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Role</th>
                    <th className="text-left p-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Department</th>
                    <th className="text-left p-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Status</th>
                    <th className="text-right p-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {orgUsers.map((u) => (
                    <tr key={u.id} className="hover:bg-slate-50 transition-colors">
                      <td className="p-4">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 bg-slate-100 rounded-full flex items-center justify-center">
                            {u.avatar ? (
                              <img src={u.avatar} alt={u.name} className="w-10 h-10 rounded-full object-cover" />
                            ) : (
                              <Users size={20} className="text-slate-400" />
                            )}
                          </div>
                          <div>
                            <p className="font-bold text-slate-900">{u.name}</p>
                            <p className="text-xs text-slate-500">{u.email}</p>
                          </div>
                        </div>
                      </td>
                      <td className="p-4">
                        <span className={`px-3 py-1 rounded-full text-xs font-bold ${u.role === 'ADMIN' ? 'bg-purple-100 text-purple-700' : u.role === 'HR' ? 'bg-blue-100 text-blue-700' : u.role === 'MANAGER' ? 'bg-amber-100 text-amber-700' : 'bg-slate-100 text-slate-700'}`}>
                          {u.role}
                        </span>
                      </td>
                      <td className="p-4">
                        <span className="text-sm text-slate-600">{u.department}</span>
                      </td>
                      <td className="p-4">
                        {(u as any).verified ? (
                          <span className="text-emerald-600 flex items-center gap-1 text-sm">
                            <CheckCircle2 size={14} /> Verified
                          </span>
                        ) : (
                          <span className="text-amber-600 flex items-center gap-1 text-sm">
                            <Clock size={14} /> Pending
                          </span>
                        )}
                      </td>
                      <td className="p-4">
                        <div className="flex items-center justify-end gap-2">
                          {!(u as any).verified && (
                            <button
                              onClick={() => handleVerifyUser(u.id)}
                              className="p-2 hover:bg-emerald-100 rounded-xl transition-all"
                              title="Verify User"
                            >
                              <UserCheck size={18} className="text-emerald-600" />
                            </button>
                          )}
                          <button
                            onClick={() => handleDeleteUser(u.id, u.name)}
                            className="p-2 hover:bg-red-100 rounded-xl transition-all"
                            title="Delete User"
                          >
                            <Trash2 size={18} className="text-red-600" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default SuperAdmin;

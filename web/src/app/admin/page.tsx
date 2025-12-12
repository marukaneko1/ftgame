"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { api, authApi } from "@/lib/api";
import { formatNumber } from "@/lib/utils";
import BackButton from "@/components/BackButton";

interface User {
  id: string;
  email: string;
  displayName: string;
  username: string;
  avatarUrl?: string | null;
  dateOfBirth?: string | null;
  is18PlusVerified: boolean;
  kycStatus: string;
  level: number;
  xp: number;
  isBanned: boolean;
  banReason?: string | null;
  isAdmin: boolean;
  latitude?: number | null;
  longitude?: number | null;
  createdAt: string;
  subscription?: {
    id: string;
    status: string;
    startedAt?: string | null;
    currentPeriodEnd?: string | null;
  } | null;
  wallet?: {
    id: string;
    balanceTokens: number;
  } | null;
}

interface Report {
  id: string;
  reasonCode: string;
  comment?: string | null;
  status: string;
  createdAt: string;
  reporter: {
    id: string;
    displayName: string;
    username: string;
    email: string;
  };
  reported: {
    id: string;
    displayName: string;
    username: string;
    email: string;
    isBanned: boolean;
  };
  session?: {
    id: string;
    createdAt: string;
    status: string;
  } | null;
}

export default function AdminDashboard() {
  const router = useRouter();
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [filterStatus, setFilterStatus] = useState<string>("all");
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [showLogin, setShowLogin] = useState(false);
  const [loginEmail, setLoginEmail] = useState("");
  const [loginPassword, setLoginPassword] = useState("");
  const [loginError, setLoginError] = useState("");
  const [loginLoading, setLoginLoading] = useState(false);
  
  // Tab state
  const [activeTab, setActiveTab] = useState<"users" | "reports">("users");
  
  // Reports state
  const [reports, setReports] = useState<Report[]>([]);
  const [reportsPage, setReportsPage] = useState(1);
  const [reportsTotalPages, setReportsTotalPages] = useState(1);
  const [reportFilterStatus, setReportFilterStatus] = useState<string>("all");
  const [selectedReport, setSelectedReport] = useState<Report | null>(null);
  const [reportsLoading, setReportsLoading] = useState(false);

  useEffect(() => {
    checkAuth();
  }, []);

  const checkAuth = async () => {
    const token = localStorage.getItem("accessToken");
    if (token) {
      try {
        // Try to access admin endpoint to verify we're logged in and admin
        await loadUsers();
        setIsLoggedIn(true);
      } catch (err: any) {
        if (err.response?.status === 401 || err.response?.status === 403) {
          setIsLoggedIn(false);
          setShowLogin(true);
          localStorage.removeItem("accessToken");
        }
      }
    } else {
      setShowLogin(true);
    }
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoginError("");
    setLoginLoading(true);

    try {
      await authApi.login(loginEmail, loginPassword);
      setIsLoggedIn(true);
      setShowLogin(false);
      await loadUsers();
    } catch (err: any) {
      setLoginError(err.response?.data?.message || "Login failed. Please check your credentials.");
    } finally {
      setLoginLoading(false);
    }
  };

  useEffect(() => {
    if (isLoggedIn) {
      loadUsers();
    }
  }, [page, isLoggedIn]);

  useEffect(() => {
    if (isLoggedIn && activeTab === "reports") {
      loadReports();
    }
  }, [reportsPage, isLoggedIn, activeTab, reportFilterStatus]);

  const loadReports = async () => {
    try {
      setReportsLoading(true);
      const statusParam = reportFilterStatus !== "all" ? `&status=${reportFilterStatus}` : "";
      const response = await api.get(`/admin/reports?page=${reportsPage}&limit=50${statusParam}`);
      setReports(response.data.reports);
      setReportsTotalPages(response.data.pagination.totalPages);
    } catch (err: any) {
      console.error("Failed to load reports:", err);
      if (err.response?.status === 403 || err.response?.status === 401) {
        setError("Admin access required");
        setIsLoggedIn(false);
        setShowLogin(true);
        localStorage.removeItem("accessToken");
      }
    } finally {
      setReportsLoading(false);
    }
  };

  const handleResolveAndBan = async (reportId: string) => {
    const reason = prompt("Enter ban reason:");
    if (!reason) return;
    
    try {
      await api.post(`/admin/reports/${reportId}/resolve-ban`, { banReason: reason });
      await loadReports();
      setSelectedReport(null);
      alert("Report resolved and user banned");
    } catch (err: any) {
      alert(err.response?.data?.message || "Failed to resolve report");
    }
  };

  const handleDismissReport = async (reportId: string) => {
    if (!confirm("Are you sure you want to dismiss this report?")) return;
    
    try {
      await api.post(`/admin/reports/${reportId}/dismiss`);
      await loadReports();
      setSelectedReport(null);
    } catch (err: any) {
      alert(err.response?.data?.message || "Failed to dismiss report");
    }
  };

  const getReasonLabel = (reasonCode: string): string => {
    const labels: Record<string, string> = {
      HARASSMENT: "🚫 Harassment",
      NSFW: "🔞 NSFW Content",
      SPAM: "📧 Spam",
      UNDERAGE: "👶 Underage",
      OTHER: "📝 Other"
    };
    return labels[reasonCode] || reasonCode;
  };

  const getStatusBadge = (status: string): { text: string; color: string } => {
    switch (status) {
      case "OPEN":
        return { text: "Open", color: "bg-yellow-600" };
      case "REVIEWED":
        return { text: "Reviewed", color: "bg-blue-600" };
      case "ACTIONED":
        return { text: "Actioned", color: "bg-green-600" };
      default:
        return { text: status, color: "bg-gray-600" };
    }
  };

  const loadUsers = async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await api.get(`/admin/users?page=${page}&limit=50`);
      setUsers(response.data.users);
      setTotalPages(response.data.pagination.totalPages);
      setError(null); // Clear any previous errors on successful load
    } catch (err: any) {
      console.error("Failed to load users:", err);
      if (err.response?.status === 403 || err.response?.status === 401) {
        setError("Admin access required");
        setIsLoggedIn(false);
        setShowLogin(true);
        localStorage.removeItem("accessToken");
      } else {
        setError(err.response?.data?.message || "Failed to load users");
      }
    } finally {
      setLoading(false);
    }
  };

  const handleVerify = async (userId: string, verified: boolean) => {
    try {
      await api.patch(`/admin/users/${userId}/verify`, { verified });
      // Auto-refresh data after update
      await loadUsers();
      // Update selected user if it's the one being modified
      if (selectedUser?.id === userId) {
        const updated = await api.get(`/admin/users/${userId}`);
        setSelectedUser(updated.data);
      }
    } catch (err: any) {
      alert(err.response?.data?.message || "Failed to update verification status");
    }
  };

  const handleKycStatus = async (userId: string, status: string) => {
    try {
      await api.patch(`/admin/users/${userId}/kyc-status`, { status });
      // Auto-refresh data after update
      await loadUsers();
      // Update selected user if it's the one being modified
      if (selectedUser?.id === userId) {
        const updated = await api.get(`/admin/users/${userId}`);
        setSelectedUser(updated.data);
      }
    } catch (err: any) {
      alert(err.response?.data?.message || "Failed to update KYC status");
    }
  };

  const handleBan = async (userId: string, reason?: string) => {
    const banReason = reason || prompt("Enter ban reason (optional):") || "Banned by administrator";
    if (!reason && !confirm("Are you sure you want to ban this user?")) return;
    try {
      await api.patch(`/admin/users/${userId}/ban`, { reason: banReason });
      // Auto-refresh data after update
      await loadUsers();
      // Update selected user if it's the one being modified
      if (selectedUser?.id === userId) {
        const updated = await api.get(`/admin/users/${userId}`);
        setSelectedUser(updated.data);
      }
    } catch (err: any) {
      alert(err.response?.data?.message || "Failed to ban user");
    }
  };

  const handleUnban = async (userId: string) => {
    if (!confirm("Are you sure you want to unban this user?")) return;
    try {
      await api.patch(`/admin/users/${userId}/unban`);
      await loadUsers();
      if (selectedUser?.id === userId) {
        const updated = await api.get(`/admin/users/${userId}`);
        setSelectedUser(updated.data);
      }
    } catch (err: any) {
      alert(err.response?.data?.message || "Failed to unban user");
    }
  };

  const handleSubscriptionChange = async (userId: string, status: string) => {
    try {
      await api.patch(`/admin/users/${userId}/subscription`, { status });
      await loadUsers();
      if (selectedUser?.id === userId) {
        const updated = await api.get(`/admin/users/${userId}`);
        setSelectedUser(updated.data);
      }
    } catch (err: any) {
      alert(err.response?.data?.message || "Failed to update subscription");
    }
  };

  const calculateAge = (dateOfBirth: string | null | undefined): number | null => {
    if (!dateOfBirth) return null;
    const dob = new Date(dateOfBirth);
    const today = new Date();
    let age = today.getFullYear() - dob.getFullYear();
    const monthDiff = today.getMonth() - dob.getMonth();
    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < dob.getDate())) {
      age--;
    }
    return age;
  };

  const filteredUsers = users.filter((user) => {
    if (filterStatus === "all") return true;
    if (filterStatus === "verified") return user.is18PlusVerified;
    if (filterStatus === "unverified") return !user.is18PlusVerified;
    if (filterStatus === "banned") return user.isBanned;
    if (filterStatus === "active_sub") return user.subscription?.status === "ACTIVE";
    return true;
  });

  if (showLogin && !isLoggedIn) {
    return (
      <main className="space-y-4">
        <div className="bg-gray-900 p-6 border border-white/20 max-w-md mx-auto">
          <h1 className="text-3xl font-semibold text-white mb-4">Admin Login</h1>
          <p className="text-sm text-gray-400 mb-4">
            Admin access required to view the dashboard.
          </p>
          <form onSubmit={handleLogin} className="space-y-4">
            {loginError && (
              <div className="bg-gray-800 border border-gray-600 p-3 text-sm text-red-400">
                {loginError}
              </div>
            )}
            <div className="space-y-2">
              <label className="text-sm text-gray-300" htmlFor="admin-email">
                Email
              </label>
              <input
                id="admin-email"
                type="email"
                required
                value={loginEmail}
                onChange={(e) => setLoginEmail(e.target.value)}
                className="w-full bg-black px-3 py-2 text-white border border-white/30 focus:outline-none focus:border-2 focus:border-white"
                placeholder="admin@example.com"
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm text-gray-300" htmlFor="admin-password">
                Password
              </label>
              <input
                id="admin-password"
                type="password"
                required
                value={loginPassword}
                onChange={(e) => setLoginPassword(e.target.value)}
                className="w-full bg-black px-3 py-2 text-white border border-white/30 focus:outline-none focus:border-2 focus:border-white"
                placeholder="••••••••"
              />
            </div>
            <button
              type="submit"
              disabled={loginLoading}
              className="w-full bg-white px-4 py-2 font-semibold text-black hover:bg-gray-200 border-2 border-white disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loginLoading ? "Logging in..." : "Login"}
            </button>
          </form>
        </div>
      </main>
    );
  }

  if (loading && users.length === 0) {
    return (
      <main className="space-y-4">
        <div className="bg-gray-900 p-6 border border-white/20 text-center text-gray-400">
          Loading users...
        </div>
      </main>
    );
  }

  if (error) {
    return (
      <main className="space-y-4">
        <div className="bg-gray-800 border border-gray-600 p-6 text-center text-red-400">
          Error: {error}
          <button
            onClick={() => {
              localStorage.removeItem("accessToken");
              setShowLogin(true);
              setIsLoggedIn(false);
              setError(null);
            }}
            className="mt-4 block mx-auto bg-gray-700 px-4 py-2 text-white hover:bg-gray-600"
          >
            Logout & Login Again
          </button>
        </div>
      </main>
    );
  }

  return (
    <main className="space-y-4">
      <div className="bg-gray-900 p-6 border border-white/20">
        <div className="flex justify-between items-start mb-4">
          <h1 className="text-3xl font-semibold text-white">Admin Dashboard</h1>
          <div className="flex gap-2">
            <BackButton href="/dashboard" />
            <button
              onClick={() => {
                localStorage.removeItem("accessToken");
                setShowLogin(true);
                setIsLoggedIn(false);
                setUsers([]);
                setReports([]);
              }}
              className="bg-gray-800 px-4 py-2 text-white border border-white/30 hover:bg-gray-700"
            >
              Logout
            </button>
          </div>
        </div>
        
        {/* Tab Navigation */}
        <div className="flex gap-2 mb-4 border-b border-white/20 pb-4">
          <button
            onClick={() => setActiveTab("users")}
            className={`px-4 py-2 font-semibold transition-colors ${
              activeTab === "users"
                ? "bg-white text-black"
                : "bg-gray-800 text-white hover:bg-gray-700"
            }`}
          >
            👥 Users
          </button>
          <button
            onClick={() => setActiveTab("reports")}
            className={`px-4 py-2 font-semibold transition-colors ${
              activeTab === "reports"
                ? "bg-white text-black"
                : "bg-gray-800 text-white hover:bg-gray-700"
            }`}
          >
            🚨 Reports
          </button>
        </div>

        {/* Users Tab Controls */}
        {activeTab === "users" && (
          <div className="flex gap-4 items-center">
            <select
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
              className="bg-black px-3 py-2 text-white border border-white/30"
            >
              <option value="all">All Users</option>
              <option value="verified">Verified (18+)</option>
              <option value="unverified">Unverified</option>
              <option value="banned">Banned</option>
              <option value="active_sub">Active Subscriptions</option>
            </select>
            <button
              onClick={async () => {
                setLoading(true);
                await loadUsers();
              }}
              disabled={loading}
              className="bg-white px-4 py-2 font-semibold text-black hover:bg-gray-200 border-2 border-white disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
            >
              {loading ? (
                <>
                  <svg
                    className="animate-spin h-4 w-4 text-black"
                    xmlns="http://www.w3.org/2000/svg"
                    fill="none"
                    viewBox="0 0 24 24"
                  >
                    <circle
                      className="opacity-25"
                      cx="12"
                      cy="12"
                      r="10"
                      stroke="currentColor"
                      strokeWidth="4"
                    ></circle>
                    <path
                      className="opacity-75"
                      fill="currentColor"
                      d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                    ></path>
                  </svg>
                  <span>Refreshing...</span>
                </>
              ) : (
                <>
                  <svg
                    className="h-4 w-4"
                    xmlns="http://www.w3.org/2000/svg"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
                    />
                  </svg>
                  <span>Refresh</span>
                </>
              )}
            </button>
          </div>
        )}

        {/* Reports Tab Controls */}
        {activeTab === "reports" && (
          <div className="flex gap-4 items-center">
            <select
              value={reportFilterStatus}
              onChange={(e) => {
                setReportFilterStatus(e.target.value);
                setReportsPage(1);
              }}
              className="bg-black px-3 py-2 text-white border border-white/30"
            >
              <option value="all">All Reports</option>
              <option value="OPEN">Open</option>
              <option value="REVIEWED">Reviewed</option>
              <option value="ACTIONED">Actioned</option>
            </select>
            <button
              onClick={loadReports}
              disabled={reportsLoading}
              className="bg-white px-4 py-2 font-semibold text-black hover:bg-gray-200 border-2 border-white disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
            >
              {reportsLoading ? "Refreshing..." : "Refresh"}
            </button>
          </div>
        )}
      </div>

      {/* Users Table */}
      {activeTab === "users" && (
        <div className="bg-gray-900 p-6 border border-white/20">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-white/20">
                  <th className="p-2 text-white text-sm font-semibold">Email</th>
                  <th className="p-2 text-white text-sm font-semibold">Display Name</th>
                  <th className="p-2 text-white text-sm font-semibold">Age</th>
                  <th className="p-2 text-white text-sm font-semibold">18+ Verified</th>
                  <th className="p-2 text-white text-sm font-semibold">KYC Status</th>
                  <th className="p-2 text-white text-sm font-semibold">Subscription</th>
                  <th className="p-2 text-white text-sm font-semibold">Tokens</th>
                  <th className="p-2 text-white text-sm font-semibold">Banned</th>
                  <th className="p-2 text-white text-sm font-semibold">Actions</th>
                </tr>
              </thead>
              <tbody>
              {filteredUsers.map((user) => {
                const age = calculateAge(user.dateOfBirth);
                return (
                  <tr key={user.id} className="border-b border-white/10 hover:bg-gray-800/50">
                    <td className="p-2 text-gray-300 text-sm">{user.email}</td>
                    <td className="p-2 text-gray-300 text-sm">{user.displayName}</td>
                    <td className="p-2 text-gray-300 text-sm">
                      {age !== null ? `${age} years` : "N/A"}
                    </td>
                    <td className="p-2 text-gray-300 text-sm">
                      {user.is18PlusVerified ? (
                        <span className="text-green-400">✓ Verified</span>
                      ) : (
                        <span className="text-red-400">✗ Not Verified</span>
                      )}
                    </td>
                    <td className="p-2 text-gray-300 text-sm">
                      <span
                        className={
                          user.kycStatus === "VERIFIED"
                            ? "text-green-400"
                            : user.kycStatus === "REJECTED"
                            ? "text-red-400"
                            : "text-yellow-400"
                        }
                      >
                        {user.kycStatus}
                      </span>
                    </td>
                    <td className="p-2 text-gray-300 text-sm">
                      <select
                        value={user.subscription?.status || "INACTIVE"}
                        onChange={(e) => handleSubscriptionChange(user.id, e.target.value)}
                        className="bg-black px-2 py-1 text-white border border-white/30 text-xs"
                        onClick={(e) => e.stopPropagation()}
                      >
                        <option value="ACTIVE">Active</option>
                        <option value="INACTIVE">Inactive</option>
                        <option value="CANCELED">Canceled</option>
                      </select>
                    </td>
                    <td className="p-2 text-gray-300 text-sm">
                      {formatNumber(user.wallet?.balanceTokens)}
                    </td>
                    <td className="p-2 text-gray-300 text-sm">
                      {user.isBanned ? (
                        <span className="text-red-400">Banned</span>
                      ) : (
                        <span className="text-green-400">Active</span>
                      )}
                    </td>
                    <td className="p-2">
                      <div className="flex gap-2 flex-wrap">
                        <button
                          onClick={() => handleVerify(user.id, !user.is18PlusVerified)}
                          className={`px-2 py-1 text-xs border ${
                            user.is18PlusVerified
                              ? "bg-red-600 border-red-500 text-white"
                              : "bg-green-600 border-green-500 text-white"
                          }`}
                        >
                          {user.is18PlusVerified ? "Unverify" : "Verify"}
                        </button>
                        <button
                          onClick={() =>
                            handleKycStatus(
                              user.id,
                              user.kycStatus === "VERIFIED" ? "PENDING" : "VERIFIED"
                            )
                          }
                          className="px-2 py-1 text-xs bg-blue-600 border border-blue-500 text-white"
                        >
                          KYC {user.kycStatus === "VERIFIED" ? "→ Pending" : "→ Verify"}
                        </button>
                        {user.isBanned ? (
                          <button
                            onClick={() => handleUnban(user.id)}
                            className="px-2 py-1 text-xs bg-green-600 border border-green-500 text-white"
                          >
                            Unban
                          </button>
                        ) : (
                          <button
                            onClick={() => handleBan(user.id)}
                            className="px-2 py-1 text-xs bg-red-600 border border-red-500 text-white"
                          >
                            Ban
                          </button>
                        )}
                        <button
                          onClick={() => setSelectedUser(user)}
                          className="px-2 py-1 text-xs bg-gray-600 border border-gray-500 text-white"
                        >
                          Details
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

          {totalPages > 1 && (
            <div className="mt-4 flex gap-2 justify-center">
              <button
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={page === 1}
                className="px-3 py-1 bg-gray-800 text-white border border-white/30 disabled:opacity-50"
              >
                Previous
              </button>
              <span className="px-3 py-1 text-gray-300">
                Page {page} of {totalPages}
              </span>
              <button
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                disabled={page === totalPages}
                className="px-3 py-1 bg-gray-800 text-white border border-white/30 disabled:opacity-50"
              >
                Next
              </button>
            </div>
          )}
        </div>
      )}

      {/* Reports Table */}
      {activeTab === "reports" && (
        <div className="bg-gray-900 p-6 border border-white/20">
          <div className="overflow-x-auto">
            {reportsLoading ? (
              <p className="text-gray-400 text-center py-8">Loading reports...</p>
            ) : reports.length === 0 ? (
              <p className="text-gray-400 text-center py-8">No reports found</p>
            ) : (
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-white/20">
                    <th className="p-2 text-white text-sm font-semibold">Date</th>
                    <th className="p-2 text-white text-sm font-semibold">Reason</th>
                    <th className="p-2 text-white text-sm font-semibold">Reporter</th>
                    <th className="p-2 text-white text-sm font-semibold">Reported User</th>
                    <th className="p-2 text-white text-sm font-semibold">Status</th>
                    <th className="p-2 text-white text-sm font-semibold">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {reports.map((report) => {
                    const statusBadge = getStatusBadge(report.status);
                    return (
                      <tr key={report.id} className="border-b border-white/10 hover:bg-gray-800/50">
                        <td className="p-2 text-gray-300 text-sm">
                          {new Date(report.createdAt).toLocaleDateString()}
                        </td>
                        <td className="p-2 text-sm">
                          <span className="text-yellow-400">{getReasonLabel(report.reasonCode)}</span>
                        </td>
                        <td className="p-2 text-gray-300 text-sm">
                          {report.reporter.displayName}
                          <span className="text-gray-500 text-xs block">@{report.reporter.username}</span>
                        </td>
                        <td className="p-2 text-sm">
                          <span className={report.reported.isBanned ? "text-red-400" : "text-gray-300"}>
                            {report.reported.displayName}
                            {report.reported.isBanned && " (Banned)"}
                          </span>
                          <span className="text-gray-500 text-xs block">@{report.reported.username}</span>
                        </td>
                        <td className="p-2 text-sm">
                          <span className={`px-2 py-1 text-xs text-white rounded ${statusBadge.color}`}>
                            {statusBadge.text}
                          </span>
                        </td>
                        <td className="p-2">
                          <div className="flex gap-2 flex-wrap">
                            <button
                              onClick={() => setSelectedReport(report)}
                              className="px-2 py-1 text-xs bg-gray-600 border border-gray-500 text-white hover:bg-gray-500"
                            >
                              Details
                            </button>
                            {report.status === "OPEN" && (
                              <>
                                <button
                                  onClick={() => handleResolveAndBan(report.id)}
                                  className="px-2 py-1 text-xs bg-red-600 border border-red-500 text-white hover:bg-red-500"
                                >
                                  Ban User
                                </button>
                                <button
                                  onClick={() => handleDismissReport(report.id)}
                                  className="px-2 py-1 text-xs bg-blue-600 border border-blue-500 text-white hover:bg-blue-500"
                                >
                                  Dismiss
                                </button>
                              </>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            )}
          </div>

          {reportsTotalPages > 1 && (
            <div className="mt-4 flex gap-2 justify-center">
              <button
                onClick={() => setReportsPage((p) => Math.max(1, p - 1))}
                disabled={reportsPage === 1}
                className="px-3 py-1 bg-gray-800 text-white border border-white/30 disabled:opacity-50"
              >
                Previous
              </button>
              <span className="px-3 py-1 text-gray-300">
                Page {reportsPage} of {reportsTotalPages}
              </span>
              <button
                onClick={() => setReportsPage((p) => Math.min(reportsTotalPages, p + 1))}
                disabled={reportsPage === reportsTotalPages}
                className="px-3 py-1 bg-gray-800 text-white border border-white/30 disabled:opacity-50"
              >
                Next
              </button>
            </div>
          )}
        </div>
      )}

      {/* Selected Report Details */}
      {selectedReport && (
        <div className="bg-gray-900 p-6 border border-white/20">
          <div className="flex justify-between items-start mb-4">
            <h2 className="text-2xl font-semibold text-white">Report Details</h2>
            <button
              onClick={() => setSelectedReport(null)}
              className="bg-gray-800 px-4 py-2 text-white border border-white/30 hover:bg-gray-700"
            >
              Close
            </button>
          </div>
          <div className="grid md:grid-cols-2 gap-4 text-sm">
            <div>
              <p className="text-gray-400">Report ID:</p>
              <p className="text-white font-mono text-xs">{selectedReport.id}</p>
            </div>
            <div>
              <p className="text-gray-400">Status:</p>
              <span className={`px-2 py-1 text-xs text-white rounded ${getStatusBadge(selectedReport.status).color}`}>
                {getStatusBadge(selectedReport.status).text}
              </span>
            </div>
            <div>
              <p className="text-gray-400">Reason:</p>
              <p className="text-yellow-400">{getReasonLabel(selectedReport.reasonCode)}</p>
            </div>
            <div>
              <p className="text-gray-400">Date:</p>
              <p className="text-white">{new Date(selectedReport.createdAt).toLocaleString()}</p>
            </div>
            <div className="md:col-span-2">
              <p className="text-gray-400">Comment:</p>
              <p className="text-white bg-gray-800 p-2 rounded mt-1">
                {selectedReport.comment || "No comment provided"}
              </p>
            </div>
            <div>
              <p className="text-gray-400">Reporter:</p>
              <p className="text-white">{selectedReport.reporter.displayName}</p>
              <p className="text-gray-500 text-xs">@{selectedReport.reporter.username}</p>
              <p className="text-gray-500 text-xs">{selectedReport.reporter.email}</p>
            </div>
            <div>
              <p className="text-gray-400">Reported User:</p>
              <p className={selectedReport.reported.isBanned ? "text-red-400" : "text-white"}>
                {selectedReport.reported.displayName}
                {selectedReport.reported.isBanned && " (Currently Banned)"}
              </p>
              <p className="text-gray-500 text-xs">@{selectedReport.reported.username}</p>
              <p className="text-gray-500 text-xs">{selectedReport.reported.email}</p>
            </div>
            {selectedReport.session && (
              <div className="md:col-span-2">
                <p className="text-gray-400">Session Info:</p>
                <p className="text-white">
                  ID: <span className="font-mono text-xs">{selectedReport.session.id}</span>
                </p>
                <p className="text-gray-500 text-xs">
                  Created: {new Date(selectedReport.session.createdAt).toLocaleString()} | Status: {selectedReport.session.status}
                </p>
              </div>
            )}
          </div>
          {selectedReport.status === "OPEN" && (
            <div className="mt-4 flex gap-2">
              <button
                onClick={() => handleResolveAndBan(selectedReport.id)}
                className="px-4 py-2 bg-red-600 border border-red-500 text-white hover:bg-red-500"
              >
                Ban User & Resolve
              </button>
              <button
                onClick={() => handleDismissReport(selectedReport.id)}
                className="px-4 py-2 bg-blue-600 border border-blue-500 text-white hover:bg-blue-500"
              >
                Dismiss Report
              </button>
            </div>
          )}
        </div>
      )}

      {/* User Details Modal */}
      {selectedUser && (
        <div className="bg-gray-900 p-6 border border-white/20">
          <div className="flex justify-between items-start mb-4">
            <h2 className="text-2xl font-semibold text-white">User Details</h2>
            <button
              onClick={() => setSelectedUser(null)}
              className="bg-gray-800 px-4 py-2 text-white border border-white/30 hover:bg-gray-700"
            >
              Close
            </button>
          </div>
          <div className="grid md:grid-cols-2 gap-4 text-sm">
            <div>
              <p className="text-gray-400">ID:</p>
              <p className="text-white">{selectedUser.id}</p>
            </div>
            <div>
              <p className="text-gray-400">Email:</p>
              <p className="text-white">{selectedUser.email}</p>
            </div>
            <div>
              <p className="text-gray-400">Display Name:</p>
              <p className="text-white">{selectedUser.displayName}</p>
            </div>
            <div>
              <p className="text-gray-400">Username:</p>
              <p className="text-white">{selectedUser.username}</p>
            </div>
            <div>
              <p className="text-gray-400">Date of Birth:</p>
              <p className="text-white">
                {selectedUser.dateOfBirth
                  ? new Date(selectedUser.dateOfBirth).toLocaleDateString()
                  : "Not provided"}
              </p>
            </div>
            <div>
              <p className="text-gray-400">Age:</p>
              <p className="text-white">
                {calculateAge(selectedUser.dateOfBirth) !== null
                  ? `${calculateAge(selectedUser.dateOfBirth)} years`
                  : "N/A"}
              </p>
            </div>
            <div>
              <p className="text-gray-400">18+ Verified:</p>
              <p className={selectedUser.is18PlusVerified ? "text-green-400" : "text-red-400"}>
                {selectedUser.is18PlusVerified ? "Yes" : "No"}
              </p>
            </div>
            <div>
              <p className="text-gray-400">KYC Status:</p>
              <p
                className={
                  selectedUser.kycStatus === "VERIFIED"
                    ? "text-green-400"
                    : selectedUser.kycStatus === "REJECTED"
                    ? "text-red-400"
                    : "text-yellow-400"
                }
              >
                {selectedUser.kycStatus}
              </p>
            </div>
            <div>
              <p className="text-gray-400">Level:</p>
              <p className="text-white">{selectedUser.level}</p>
            </div>
            <div>
              <p className="text-gray-400">XP:</p>
              <p className="text-white">{selectedUser.xp}</p>
            </div>
            <div>
              <p className="text-gray-400">Subscription Status:</p>
              <select
                value={selectedUser.subscription?.status || "INACTIVE"}
                onChange={(e) => handleSubscriptionChange(selectedUser.id, e.target.value)}
                className="bg-black px-3 py-2 text-white border border-white/30 mt-1"
              >
                <option value="ACTIVE">Active</option>
                <option value="INACTIVE">Inactive</option>
                <option value="CANCELED">Canceled</option>
              </select>
            </div>
            <div>
              <p className="text-gray-400">Subscription Started:</p>
              <p className="text-white">
                {selectedUser.subscription?.startedAt
                  ? new Date(selectedUser.subscription.startedAt).toLocaleDateString()
                  : "N/A"}
              </p>
            </div>
            <div>
              <p className="text-gray-400">Token Balance:</p>
              <p className="text-white">{formatNumber(selectedUser.wallet?.balanceTokens)}</p>
            </div>
            <div>
              <p className="text-gray-400">Banned:</p>
              <p className={selectedUser.isBanned ? "text-red-400" : "text-green-400"}>
                {selectedUser.isBanned ? `Yes - ${selectedUser.banReason || "No reason"}` : "No"}
              </p>
            </div>
            <div>
              <p className="text-gray-400">Created At:</p>
              <p className="text-white">
                {new Date(selectedUser.createdAt).toLocaleDateString()}
              </p>
            </div>
            {selectedUser.latitude && selectedUser.longitude && (
              <div>
                <p className="text-gray-400">Location:</p>
                <p className="text-white">
                  {selectedUser.latitude.toFixed(4)}, {selectedUser.longitude.toFixed(4)}
                </p>
              </div>
            )}
          </div>
        </div>
      )}
    </main>
  );
}

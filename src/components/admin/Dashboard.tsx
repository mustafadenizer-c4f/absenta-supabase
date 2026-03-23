// src/components/admin/Dashboard.tsx - MUI COMPATIBLE VERSION
import React, { useEffect, useState } from "react";
import { useSelector } from "react-redux";
import { RootState } from "../../store";
import { supabase } from "../../config/supabase";
import {
  Box,
  Typography,
  Paper,
  Button,
  CircularProgress,
  Alert,
  Card,
  CardContent,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Chip,
} from "@mui/material";
import {
  People,
  AdminPanelSettings,
  ManageAccounts,
  Person,
  Refresh,
  Info,
} from "@mui/icons-material";
import { useNavigate } from "react-router-dom";

const AdminDashboard: React.FC = () => {
  const { user: currentUser } = useSelector((state: RootState) => state.auth);
  const [users, setUsers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const navigate = useNavigate();

  useEffect(() => {
    fetchUsers();
  }, []);

  const fetchUsers = async () => {
    try {
      setLoading(true);
      let query = supabase
        .from("users")
        .select("*")
        .order("full_name");

      // Scope to admin's company
      if (currentUser?.company_id) {
        query = query.eq("company_id", currentUser.company_id);
      }

      const { data, error } = await query;

      if (error) throw error;
      setUsers(data || []);
    } catch (err : any) {
      setError(err.message);
      console.error("Error fetching users:", err);
    } finally {
      setLoading(false);
    }
  };

  const stats = {
    totalUsers: users.length,
    admins: users.filter((u) => u.role === 'admin').length,
    generalManagers: users.filter((u) => u.role === 'department_manager').length,
    groupManagers: users.filter((u) => u.role === 'group_manager').length,
    managers: users.filter((u) => u.role === 'manager').length,
    staff: users.filter((u) => u.role === 'staff').length,
    pendingPasswordReset: users.filter((u) => u.requires_password_change)
      .length,
  };

  if (loading) {
    return (
      <Box
        display="flex"
        justifyContent="center"
        alignItems="center"
        minHeight="400px"
      >
        <CircularProgress />
      </Box>
    );
  }

  if (error) {
    return (
      <Alert severity="error" sx={{ mb: 3 }}>
        {error}
        <Button onClick={fetchUsers} sx={{ ml: 2 }}>
          Retry
        </Button>
      </Alert>
    );
  }

  return (
    <Box>
      {/* Header */}
      <Box
        sx={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          mb: 4,
        }}
      >
        <Typography
          variant="h4"
          sx={{ color: "primary.main", fontWeight: 600 }}
        >
          Admin Dashboard
        </Typography>
        <Box sx={{ display: "flex", gap: 2 }}>
          <Button
            variant="outlined"
            startIcon={<Refresh />}
            onClick={fetchUsers}
          >
            Refresh
          </Button>

        </Box>
      </Box>

      {/* Stats Cards */}
      <Box sx={{ display: "flex", flexWrap: "wrap", gap: 3, mb: 4 }}>
        <Card sx={{ flex: "1 1 200px", minWidth: "200px" }}>
          <CardContent>
            <Box sx={{ display: "flex", alignItems: "center", mb: 2 }}>
              <People color="primary" sx={{ mr: 1 }} />
              <Typography variant="h6">Total Users</Typography>
            </Box>
            <Typography variant="h4" color="primary">
              {stats.totalUsers}
            </Typography>
          </CardContent>
        </Card>

        <Card sx={{ flex: "1 1 200px", minWidth: "200px" }}>
          <CardContent>
            <Box sx={{ display: "flex", alignItems: "center", mb: 2 }}>
              <AdminPanelSettings color="primary" sx={{ mr: 1 }} />
              <Typography variant="h6">Admins</Typography>
            </Box>
            <Typography variant="h4" color="secondary">
              {stats.admins}
            </Typography>
          </CardContent>
        </Card>

        <Card sx={{ flex: "1 1 200px", minWidth: "200px" }}>
          <CardContent>
            <Box sx={{ display: "flex", alignItems: "center", mb: 2 }}>
              <ManageAccounts color="info" sx={{ mr: 1 }} />
              <Typography variant="h6">Dept. Managers</Typography>
            </Box>
            <Typography variant="h4" sx={{ color: "info.main" }}>
              {stats.generalManagers}
            </Typography>
          </CardContent>
        </Card>

        <Card sx={{ flex: "1 1 200px", minWidth: "200px" }}>
          <CardContent>
            <Box sx={{ display: "flex", alignItems: "center", mb: 2 }}>
              <ManageAccounts sx={{ mr: 1, color: "warning.main" }} />
              <Typography variant="h6">Group Managers</Typography>
            </Box>
            <Typography variant="h4" sx={{ color: "warning.main" }}>
              {stats.groupManagers}
            </Typography>
          </CardContent>
        </Card>

        <Card sx={{ flex: "1 1 200px", minWidth: "200px" }}>
          <CardContent>
            <Box sx={{ display: "flex", alignItems: "center", mb: 2 }}>
              <ManageAccounts color="info" sx={{ mr: 1 }} />
              <Typography variant="h6">Managers</Typography>
            </Box>
            <Typography variant="h4" sx={{ color: "info.main" }}>
              {stats.managers}
            </Typography>
          </CardContent>
        </Card>

        <Card sx={{ flex: "1 1 200px", minWidth: "200px" }}>
          <CardContent>
            <Box sx={{ display: "flex", alignItems: "center", mb: 2 }}>
              <Person color="warning" sx={{ mr: 1 }} />
              <Typography variant="h6">Staff</Typography>
            </Box>
            <Typography variant="h4" sx={{ color: "success.main" }}>
              {stats.staff}
            </Typography>
          </CardContent>
        </Card>
      </Box>

      {/* Users Table */}
      <Paper sx={{ p: 3, mb: 3 }}>
        <Typography variant="h6" sx={{ mb: 3, fontWeight: 600 }}>
          All Users
        </Typography>

        <TableContainer>
          <Table>
            <TableHead>
              <TableRow>
                <TableCell>
                  <strong>Name</strong>
                </TableCell>
                <TableCell>
                  <strong>Email</strong>
                </TableCell>
                <TableCell>
                  <strong>Role</strong>
                </TableCell>
                <TableCell>
                  <strong>Status</strong>
                </TableCell>
                <TableCell>
                  <strong>Hire Date</strong>
                </TableCell>

              </TableRow>
            </TableHead>
            <TableBody>
              {users.map((user) => (
                <TableRow key={user.id} hover>
                  <TableCell>
                    <Box sx={{ display: "flex", alignItems: "center", gap: 2 }}>
                      <Box
                        sx={{
                          width: 40,
                          height: 40,
                          borderRadius: "50%",
                          bgcolor:
                            user.id === currentUser?.id
                              ? "primary.main"
                              : "secondary.main",
                          color: "white",
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                          fontWeight: "bold",
                        }}
                      >
                        {user.full_name?.charAt(0).toUpperCase() || "U"}
                      </Box>
                      <Box>
                        <Typography fontWeight="medium">
                          {user.full_name}
                          {user.id === currentUser?.id && (
                            <Chip label="You" size="small" sx={{ ml: 1 }} />
                          )}
                        </Typography>
                        <Typography variant="body2" color="textSecondary">
                          ID: {user.id.substring(0, 8)}...
                        </Typography>
                      </Box>
                    </Box>
                  </TableCell>
                  <TableCell>{user.email}</TableCell>
                  <TableCell>
                    <Chip
                      label={
                        user.role === 'admin'
                          ? "Admin"
                          : user.role === 'department_manager'
                          ? "Dept. Manager"
                          : user.role === 'group_manager'
                          ? "Group Manager"
                          : user.role === 'manager'
                          ? "Manager"
                          : "Staff"
                      }
                      color={
                        user.role === 'admin'
                          ? "primary"
                          : user.role === 'department_manager'
                          ? "info"
                          : user.role === 'group_manager'
                          ? "warning"
                          : user.role === 'manager'
                          ? "secondary"
                          : "default"
                      }
                      size="small"
                    />
                  </TableCell>
                  <TableCell>
                    <Chip
                      label={
                        user.requires_password_change
                          ? "Reset Required"
                          : "Active"
                      }
                      color={
                        user.requires_password_change ? "warning" : "success"
                      }
                      size="small"
                    />
                  </TableCell>
                  <TableCell>
                    {new Date(user.hire_date).toLocaleDateString()}
                  </TableCell>

                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
      </Paper>

      {/* Quick Actions */}
      <Box sx={{ display: "flex", flexWrap: "wrap", gap: 3 }}>
        <Card sx={{ flex: "1 1 300px", minWidth: "300px" }}>
          <CardContent>
            <Typography variant="h6" sx={{ mb: 2, fontWeight: 600 }}>
              Quick Actions
            </Typography>
            <Box sx={{ display: "flex", flexDirection: "column", gap: 2 }}>
              <Button
                variant="outlined"
                startIcon={<People />}
                onClick={() => (window.location.href = "/admin/users")}
                fullWidth
                sx={{ justifyContent: "flex-start" }}
              >
                Manage Users
              </Button>
              <Button
                variant="outlined"
                startIcon={<ManageAccounts />}
                onClick={() => (window.location.href = "/admin/leave-types")}
                fullWidth
                sx={{ justifyContent: "flex-start" }}
              >
                Manage Leave Types
              </Button>
              <Button
                variant="outlined"
                startIcon={<Person />}
                onClick={() => (window.location.href = "/admin/holidays")}
                fullWidth
                sx={{ justifyContent: "flex-start" }}
              >
                Manage Holidays
              </Button>
            </Box>
          </CardContent>
        </Card>

        <Card sx={{ flex: "1 1 300px", minWidth: "300px" }}>
          <CardContent>
            <Typography variant="h6" sx={{ mb: 2, fontWeight: 600 }}>
              System Info
            </Typography>
            <Box sx={{ display: "flex", flexDirection: "column", gap: 1 }}>
              <Typography variant="body2">
                <strong>Current User:</strong> {currentUser?.full_name}
              </Typography>
              <Typography variant="body2">
                <strong>Role:</strong>{" "}
                {currentUser?.role === 'admin'
                  ? "Administrator"
                  : currentUser?.role === 'department_manager'
                  ? "Department Manager"
                  : currentUser?.role === 'group_manager'
                  ? "Group Manager"
                  : currentUser?.role === 'manager'
                  ? "Manager"
                  : "Staff"}
              </Typography>
              <Typography variant="body2">
                <strong>Email:</strong> {currentUser?.email}
              </Typography>
              <Typography variant="body2">
                <strong>Hire Date:</strong>{" "}
                {currentUser?.hire_date
                  ? new Date(currentUser.hire_date).toLocaleDateString()
                  : "N/A"}
              </Typography>
              <Typography variant="body2">
                <strong>Status:</strong>
                <Chip
                  label={
                    currentUser?.requires_password_change
                      ? "Password Reset Required"
                      : "Active"
                  }
                  size="small"
                  color={
                    currentUser?.requires_password_change
                      ? "warning"
                      : "success"
                  }
                  sx={{ ml: 1 }}
                />
              </Typography>
            </Box>
            <Button
              variant="contained"
              fullWidth
              sx={{ mt: 3 }}
              onClick={() => (window.location.href = "/profile")}
            >
              View Profile
            </Button>
          </CardContent>
        </Card>
      </Box>

      {/* Footer */}
      <Box
        sx={{
          mt: 4,
          pt: 3,
          borderTop: 1,
          borderColor: "divider",
          textAlign: "center",
          color: "text.secondary",
          fontSize: "14px",
        }}
      >
        <Typography variant="body2">
          Absenta v1.0
        </Typography>
        <Typography variant="body2" sx={{ mt: 1 }}>
          {stats.totalUsers} users • {stats.admins} admins • {stats.generalManagers}{" "}
          general managers • {stats.groupManagers} group managers • {stats.managers}{" "}
          managers • {stats.staff} staff
        </Typography>
      </Box>
    </Box>
  );
};

export default AdminDashboard;

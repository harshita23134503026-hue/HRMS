import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import axios from "axios";
import { BASE_URL } from "../../utility/Config";

const RbacContext = createContext(null);

const parseJwtPayload = (token) => {
  try {
    if (!token) return null;
    const payload = token.split(".")[1];
    if (!payload) return null;
    return JSON.parse(atob(payload));
  } catch (error) {
    return null;
  }
};

const actionAliases = {
  read: "view",
  manage: ["view", "create", "update", "delete"],
  write: ["create", "update", "delete"],
};

const expandPermission = (permissionKey) => {
  if (!permissionKey || !permissionKey.includes(".")) return [permissionKey];
  const [moduleName, action] = permissionKey.split(".");

  if (!actionAliases[action]) {
    return [permissionKey];
  }

  const alias = actionAliases[action];
  if (Array.isArray(alias)) {
    return alias.map((item) => `${moduleName}.${item}`);
  }

  return [`${moduleName}.${alias}`, permissionKey];
};

export const RbacProvider = ({ children }) => {
  const [rbac, setRbac] = useState({
    loading: true,
    role: null,
    permissions: [],
    permissionSet: new Set(),
    isAllAccess: false,
    companyCode: null,
  });

  const refreshRbac = useCallback(async () => {
    const token = localStorage.getItem("token");
    if (!token) {
      setRbac({
        loading: false,
        role: null,
        permissions: [],
        permissionSet: new Set(),
        isAllAccess: false,
        companyCode: null,
      });
      return;
    }

    try {
      const response = await axios.get(`${BASE_URL}/rbac/me`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      const permissions = Array.isArray(response.data?.permissions)
        ? response.data.permissions
        : [];

      const expanded = new Set();
      permissions.forEach((key) => {
        expandPermission(key).forEach((derived) => expanded.add(derived));
      });

      setRbac({
        loading: false,
        role: response.data?.role || null,
        permissions,
        permissionSet: expanded,
        isAllAccess: Boolean(response.data?.isAllAccess),
        companyCode: response.data?.companyCode || null,
      });
    } catch (error) {
      const fallbackPayload = parseJwtPayload(token);
      const fallbackRole = fallbackPayload?.role || null;

      setRbac({
        loading: false,
        role: fallbackRole || null,
        permissions: [],
        permissionSet: new Set(),
        isAllAccess: false,
        companyCode: fallbackPayload?.companyCode || fallbackPayload?.id || null,
      });
    }
  }, []);

  useEffect(() => {
    refreshRbac();

    const onStorage = (event) => {
      if (event.key === "token") {
        refreshRbac();
      }
    };

    window.addEventListener("storage", onStorage);
    return () => window.removeEventListener("storage", onStorage);
  }, [refreshRbac]);

  const hasPermission = useCallback(
    (permissionKey) => {
      if (!permissionKey) return true;
      if (rbac.isAllAccess) return true;
      return rbac.permissionSet.has(permissionKey);
    },
    [rbac.isAllAccess, rbac.permissionSet]
  );

  const hasAnyPermission = useCallback(
    (permissionKeys = []) => {
      if (!permissionKeys?.length) return true;
      if (rbac.isAllAccess) return true;
      return permissionKeys.some((key) => hasPermission(key));
    },
    [hasPermission, rbac.isAllAccess]
  );

  const value = useMemo(
    () => ({
      ...rbac,
      refreshRbac,
      hasPermission,
      hasAnyPermission,
    }),
    [rbac, refreshRbac, hasPermission, hasAnyPermission]
  );

  return <RbacContext.Provider value={value}>{children}</RbacContext.Provider>;
};

export const useRbac = () => {
  const context = useContext(RbacContext);
  if (!context) {
    throw new Error("useRbac must be used inside RbacProvider");
  }
  return context;
};
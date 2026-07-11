import axios from "axios";
import { BASE_URL } from "./Config";

export const logoutUser = async (token) => {
  try {
    await axios.post(
      `${BASE_URL}/auth/logout`,
      {},
      {
        headers: { Authorization: `Bearer ${token}` },
        withCredentials: true,
      }
    );
    // Remove token from localStorage
    localStorage.removeItem("token");
    return true;
  } catch (error) {
    // Always remove token for security
    localStorage.removeItem("token");
    return false;
  }
};

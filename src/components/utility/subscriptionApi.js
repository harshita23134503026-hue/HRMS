import axios from "axios";
import { BASE_URL } from "./Config";

const getAuthHeaders = (token) => ({
  headers: {
    Authorization: `Bearer ${token}`,
  },
});

export const fetchSubscriptionOverview = async (token) => {
  const response = await axios.get(`${BASE_URL}/company/subscription`, getAuthHeaders(token));
  return response.data;
};

export const upgradeSubscriptionPlan = async (token, planId) => {
  const response = await axios.post(
    `${BASE_URL}/company/subscription/upgrade`,
    { planId },
    getAuthHeaders(token)
  );
  return response.data;
};

import axios from 'axios';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

export const getHistoricalData = async (hours = 24) => {
  const response = await axios.get(`${API_BASE_URL}/historical?hours=${hours}`);
  return response.data;
};

export const getAlerts = async (hours = null) => {
  const query = hours ? `?hours=${hours}` : '';
  const response = await axios.get(`${API_BASE_URL}/alerts${query}`);
  return response.data;
};

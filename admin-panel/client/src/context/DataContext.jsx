import React, { createContext, useContext, useState, useEffect } from 'react';
import axios from 'axios';
import { getApiUrl } from '../utils/api';


const DataContext = createContext();

export const useData = () => useContext(DataContext);

export const DataProvider = ({ children }) => {
  const [items, setItems] = useState([]);
  const [categories, setCategories] = useState([]);
  const [deals, setDeals] = useState([]);
  const [ingredients, setIngredients] = useState([]);
  
  const [isDataLoading, setIsDataLoading] = useState(true);
  const [dataError, setDataError] = useState(null);

  const fetchAllData = async () => {
    setIsDataLoading(true);
    try {
      const [itemsRes, catsRes, dealsRes, ingRes] = await Promise.all([
        axios.get(getApiUrl('/api/items')),
        axios.get(getApiUrl('/api/categories')),
        axios.get(getApiUrl('/api/deals')),
        axios.get(getApiUrl('/api/ingredients'))
      ]);
      
      setItems(itemsRes.data);
      setCategories(catsRes.data);
      setDeals(dealsRes.data);
      setIngredients(ingRes.data);
      setDataError(null);
    } catch (err) {
      console.error(err);
      setDataError(err.message);
    } finally {
      setIsDataLoading(false);
    }
  };

  useEffect(() => {
    fetchAllData();
  }, []);

  return (
    <DataContext.Provider value={{
      items, setItems,
      categories, setCategories,
      deals, setDeals,
      ingredients, setIngredients,
      isDataLoading,
      dataError,
      refreshData: fetchAllData
    }}>
      {children}
    </DataContext.Provider>
  );
};

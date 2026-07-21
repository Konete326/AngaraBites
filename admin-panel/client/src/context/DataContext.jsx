import React, { createContext, useContext, useState, useEffect } from 'react';
import api from '../utils/api';


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
      const [itemsRes, catsRes, dealsRes, ingRes] = await Promise.allSettled([
        api.get('/api/items'),
        api.get('/api/categories'),
        api.get('/api/deals'),
        api.get('/api/ingredients')
      ]);

      if (itemsRes.status === 'fulfilled' && Array.isArray(itemsRes.value?.data)) setItems(itemsRes.value.data);
      if (catsRes.status === 'fulfilled' && Array.isArray(catsRes.value?.data)) setCategories(catsRes.value.data);
      if (dealsRes.status === 'fulfilled' && Array.isArray(dealsRes.value?.data)) setDeals(dealsRes.value.data);
      if (ingRes.status === 'fulfilled' && Array.isArray(ingRes.value?.data)) setIngredients(ingRes.value.data);
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

import { useEffect, useState } from 'react';

// Define the event types
export type EventType = 
  | 'inventory-update'
  | 'transfer-update'
  | 'sale-update'
  | 'product-update'
  | 'store-update'
  | 'warehouse-update'
  | 'user-update'
  | 'customer-update';

// Define the event data structure
export interface EventData {
  type: EventType;
  entityId: string;
  action: string;
  data?: any;
  timestamp: number;
}

// Create a custom hook for subscribing to real-time events
export function useRealTimeEvents(
  eventTypes: EventType[],
  callback: (event: EventData) => void
) {
  useEffect(() => {
    // Create an EventSource connection
    const eventSource = new EventSource('/api/events');
    
    // Handle connection open
    eventSource.onopen = () => {
      console.log('SSE connection established');
    };
    
    // Handle connection error
    eventSource.onerror = (error) => {
      console.error('SSE connection error:', error);
      eventSource.close();
    };
    
    // Handle incoming messages
    eventSource.onmessage = (event) => {
      try {
        const eventData = JSON.parse(event.data) as EventData;
        
        // Check if we're subscribed to this event type
        if (eventTypes.includes(eventData.type)) {
          callback(eventData);
        }
      } catch (error) {
        console.error('Error parsing SSE event:', error);
      }
    };
    
    // Clean up on unmount
    return () => {
      eventSource.close();
    };
  }, [eventTypes, callback]);
}

// Create a custom hook for inventory alerts
export function useInventoryAlerts(warehouseId?: string, storeId?: string) {
  const [lowStockItems, setLowStockItems] = useState<any[]>([]);
  const [outOfStockItems, setOutOfStockItems] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  
  // Fetch initial data
  useEffect(() => {
    const fetchAlerts = async () => {
      setIsLoading(true);
      
      try {
        // Build query params
        const params = new URLSearchParams();
        if (warehouseId) params.append('warehouseId', warehouseId);
        if (storeId) params.append('storeId', storeId);
        
        const response = await fetch(`/api/inventory/alerts?${params.toString()}`);
        
        if (response.ok) {
          const data = await response.json();
          setLowStockItems(data.lowStockItems || []);
          setOutOfStockItems(data.outOfStockItems || []);
        }
      } catch (error) {
        console.error('Error fetching inventory alerts:', error);
      } finally {
        setIsLoading(false);
      }
    };
    
    fetchAlerts();
  }, [warehouseId, storeId]);
  
  // Subscribe to real-time updates
  useRealTimeEvents(['inventory-update'], (event) => {
    // Refresh data when inventory is updated
    if (
      event.action === 'add' ||
      event.action === 'remove' ||
      event.action === 'update'
    ) {
      // Fetch updated data
      const fetchAlerts = async () => {
        try {
          // Build query params
          const params = new URLSearchParams();
          if (warehouseId) params.append('warehouseId', warehouseId);
          if (storeId) params.append('storeId', storeId);
          
          const response = await fetch(`/api/inventory/alerts?${params.toString()}`);
          
          if (response.ok) {
            const data = await response.json();
            setLowStockItems(data.lowStockItems || []);
            setOutOfStockItems(data.outOfStockItems || []);
          }
        } catch (error) {
          console.error('Error fetching inventory alerts:', error);
        }
      };
      
      fetchAlerts();
    }
  });
  
  return {
    lowStockItems,
    outOfStockItems,
    isLoading,
  };
}

// Create a custom hook for transfer notifications
export function useTransferNotifications(userId: string) {
  const [pendingTransfers, setPendingTransfers] = useState<any[]>([]);
  const [incomingTransfers, setIncomingTransfers] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  
  // Fetch initial data
  useEffect(() => {
    const fetchNotifications = async () => {
      setIsLoading(true);
      
      try {
        const response = await fetch(`/api/transfers/notifications?userId=${userId}`);
        
        if (response.ok) {
          const data = await response.json();
          setPendingTransfers(data.pendingTransfers || []);
          setIncomingTransfers(data.incomingTransfers || []);
        }
      } catch (error) {
        console.error('Error fetching transfer notifications:', error);
      } finally {
        setIsLoading(false);
      }
    };
    
    if (userId) {
      fetchNotifications();
    }
  }, [userId]);
  
  // Subscribe to real-time updates
  useRealTimeEvents(['transfer-update'], (event) => {
    // Refresh data when transfers are updated
    if (
      event.action === 'create' ||
      event.action === 'update' ||
      event.action === 'approve' ||
      event.action === 'reject' ||
      event.action === 'ship' ||
      event.action === 'receive' ||
      event.action === 'cancel'
    ) {
      // Fetch updated data
      const fetchNotifications = async () => {
        try {
          const response = await fetch(`/api/transfers/notifications?userId=${userId}`);
          
          if (response.ok) {
            const data = await response.json();
            setPendingTransfers(data.pendingTransfers || []);
            setIncomingTransfers(data.incomingTransfers || []);
          }
        } catch (error) {
          console.error('Error fetching transfer notifications:', error);
        }
      };
      
      if (userId) {
        fetchNotifications();
      }
    }
  });
  
  return {
    pendingTransfers,
    incomingTransfers,
    isLoading,
  };
}

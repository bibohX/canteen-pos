import React, { useState, useEffect } from 'react';
import { User, Transaction, Product } from '../types';
import { supabase } from '../services/supabase';
import { QRCodeDisplay } from '../components/QRCodeDisplay';
import { GeminiService } from '../services/gemini';
import { Wallet, Sparkles, AlertCircle } from 'lucide-react';

interface Props {
  user: User;
  view: string;
}

export const StudentDashboard: React.FC<Props> = ({ user, view }) => {
  const [profile, setProfile] = useState<any>(null);
  const [transactions, setTransactions] = useState<any[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [suggestion, setSuggestion] = useState<{ text: string, cost: number } | null>(null);
  const [loadingSuggestion, setLoadingSuggestion] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchData = async () => {
      if (!user?.id) return;

      setLoading(true);
      setError(null);

      try {
        // Fetch student profile
        const { data: profileData, error: profileError } = await supabase
          .from('profiles')
          .select('*')
          .eq('id', user.id)
          .single();

        if (profileError) throw new Error(`Failed to fetch profile: ${profileError.message}`);
        setProfile(profileData);

        // Fetch products
        const { data: productsData, error: productsError } = await supabase
            .from('products')
            .select('*');

        if (productsError) throw new Error(`Failed to fetch products: ${productsError.message}`);
        setProducts(productsData || []);

        // Fetch transactions (orders)
        const { data: ordersData, error: ordersError } = await supabase
          .from('orders')
          .select(`
            id,
            created_at,
            total_amount,
            order_items (
              quantity,
              products (
                name
              )
            )
          `)
          .eq('user_id', user.id)
          .order('created_at', { ascending: false });

        if (ordersError) throw new Error(`Failed to fetch transactions: ${ordersError.message}`);

        // Transform orders into the Transaction type expected by the UI
        const transformedTransactions = ordersData.map(order => ({
            id: order.id,
            timestamp: order.created_at,
            totalAmount: order.total_amount,
            type: 'PURCHASE', // Assuming all orders are purchases for now
            items: order.order_items.map((item: any) => ({
                quantity: item.quantity,
                product: { name: item.products.name }
            }))
        }));

        setTransactions(transformedTransactions);

      } catch (e: any) {
        setError(e.message);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [user.id]);

  const getAiSuggestion = async () => {
    setLoadingSuggestion(true);
    const result = await GeminiService.suggestMeal(products, profile?.balance || 0);
    if (result && result.suggestion) {
      setSuggestion({ text: result.suggestion, cost: result.totalCost || 0 });
    }
    setLoadingSuggestion(false);
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-16 w-16 border-t-2 border-b-2 border-indigo-500"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-100 border-l-4 border-red-500 text-red-700 p-4 rounded-lg" role="alert">
        <p className="font-bold">Error</p>
        <p>{error}</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <header className="mb-8">
        <h1 className="text-3xl font-bold text-slate-800">
           {view === 'history' ? 'Transaction History' : 'My Wallet'}
        </h1>
        <p className="text-slate-500">
           {view === 'history' ? 'View all your past transactions' : 'Manage your funds and view your ID'}
        </p>
      </header>

      {view === 'dashboard' && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* Balance Card */}
          <div className="bg-gradient-to-br from-indigo-500 to-purple-600 rounded-2xl p-6 text-white shadow-lg flex flex-col justify-between h-64">
            <div>
              <p className="text-indigo-100 font-medium mb-1">Current Balance</p>
              <h2 className="text-4xl font-bold">₱{profile?.balance?.toFixed(2) || '0.00'}</h2>
            </div>
            <div className="mt-4 pt-4 border-t border-white/20">
              <p className="text-sm opacity-90 mb-2 flex items-center gap-2">
                <Sparkles size={16} /> Budget Advisor
              </p>
              {loadingSuggestion ? (
                 <div className="bg-white/10 rounded-lg p-3 animate-pulse space-y-2">
                     <div className="h-4 bg-white/30 rounded w-3/4"></div>
                     <div className="h-3 bg-white/20 rounded w-1/2"></div>
                 </div>
              ) : suggestion ? (
                <div className="bg-white/20 backdrop-blur-md rounded-lg p-3 text-sm animate-in fade-in">
                  <p>"{suggestion.text}"</p>
                  <p className="text-xs mt-1 font-bold">Est: ₱{suggestion.cost}</p>
                </div>
              ) : (
                <button
                  onClick={getAiSuggestion}
                  disabled={loadingSuggestion}
                  className="w-full py-2 bg-white/20 hover:bg-white/30 backdrop-blur-sm rounded-lg text-sm transition-colors flex items-center justify-center gap-2"
                >
                  What can I eat?
                </button>
              )}
            </div>
          </div>

          {/* QR Code Card */}
          <div className="md:col-span-1 bg-white rounded-2xl p-6 shadow-sm border border-slate-100 flex flex-col items-center justify-center text-center h-64">
             <p className="text-sm font-semibold text-slate-400 mb-4 uppercase tracking-wider">Student ID / Payment QR</p>
             {profile?.student_id && <QRCodeDisplay value={profile.student_id} size={140} />}
             <p className="mt-3 text-lg font-bold text-slate-700">{profile?.student_id}</p>
          </div>

          {/* Quick Stats / Recent Activity */}
          <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-100 h-64 overflow-hidden flex flex-col">
            <h3 className="font-semibold text-slate-800 mb-4">Recent Activity</h3>
            <div className="flex-1 overflow-y-auto space-y-3 pr-2 custom-scrollbar">
              {transactions.length === 0 ? (
                <p className="text-slate-400 text-sm text-center mt-10">No transactions yet.</p>
              ) : (
                transactions.slice(0, 5).map((tx) => (
                  <div key={tx.id} className="flex justify-between items-center text-sm p-2 hover:bg-slate-50 rounded-lg">
                    <div className="flex items-center gap-3">
                       <div className={`w-8 h-8 rounded-full flex items-center justify-center ${tx.type === 'TOPUP' ? 'bg-green-100 text-green-600' : 'bg-red-100 text-red-600'}`}>
                          {tx.type === 'TOPUP' ? '+' : '-'}
                       </div>
                       <div>
                         <p className="font-medium text-slate-700">{tx.type === 'TOPUP' ? 'Wallet Top-up' : 'Canteen Purchase'}</p>
                         <p className="text-xs text-slate-400">{new Date(tx.timestamp).toLocaleDateString()}</p>
                       </div>
                    </div>
                    <span className={`font-semibold ${tx.type === 'TOPUP' ? 'text-green-600' : 'text-slate-800'}`}>
                      {tx.type === 'TOPUP' ? '+' : '-'}₱{tx.totalAmount.toFixed(2)}
                    </span>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      )}

      {/* Transaction History Full List */}
      {view === 'history' && (
        <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-100">
          <h3 className="text-lg font-bold text-slate-800 mb-4 flex items-center gap-2">
              <Wallet size={20} className="text-indigo-500" />
              Full History
          </h3>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="border-b border-slate-100 text-slate-500">
                  <th className="pb-3 pl-2">Date</th>
                  <th className="pb-3">Description</th>
                  <th className="pb-3 text-right">Amount</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {transactions.map((tx) => (
                  <tr key={tx.id} className="hover:bg-slate-50">
                    <td className="py-3 pl-2 text-slate-500">{new Date(tx.timestamp).toLocaleString()}</td>
                    <td className="py-3 text-slate-700">
                      {tx.type === 'TOPUP' ? (
                          'Funds added by Admin'
                      ) : (
                          <div className="flex flex-col">
                              <span>Purchase</span>
                              <span className="text-xs text-slate-400">
                                  {tx.items.map(i => `${i.quantity}x ${i.product.name}`).join(', ')}
                              </span>
                          </div>
                      )}
                    </td>
                    <td className={`py-3 text-right font-medium ${tx.type === 'TOPUP' ? 'text-green-600' : 'text-slate-900'}`}>
                       {tx.type === 'TOPUP' ? '+' : '-'}₱{tx.totalAmount.toFixed(2)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
};
import React, { useState, useEffect } from 'react';
import { User, Product, Transaction, Role } from '../types';
import { GeminiService } from '../services/gemini';
import { supabase } from '../services/supabase';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts';
import { Plus, Users, ShoppingBag, Sparkles, TrendingUp, Loader2, Image as ImageIcon, Pencil, Lock, Trophy, Trash2, Package, UserPlus } from 'lucide-react';

interface Props {
  view: string;
}

// Helper component for Product Images with fallback
const ProductImage = ({ src, alt }: { src?: string, alt: string }) => {
  const [hasError, setHasError] = useState(false);

  if (!src || hasError) {
    return (
      <div className="w-full h-full bg-slate-100 flex items-center justify-center">
        <ImageIcon className="text-slate-300" size={32} />
      </div>
    );
  }

  return (
    <img
      src={src}
      alt={alt}
      className="w-full h-full object-cover"
      onError={() => setHasError(true)}
    />
  );
};

export const AdminDashboard: React.FC<Props> = ({ view }) => {
  const [users, setUsers] = useState<User[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [aiInsight, setAiInsight] = useState<string>('');
  const [loadingAi, setLoadingAi] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Form States
  const [showAddMoney, setShowAddMoney] = useState<string | null>(null); // userId
  const [topUpAmount, setTopUpAmount] = useState('');
  
  // Product Form State (Used for Add and Edit)
  const [showProductForm, setShowProductForm] = useState(false);
  const [productForm, setProductForm] = useState<Partial<Product>>({ 
    name: '', price: 0, category: 'Food', image: '', isAvailable: true, stock: 0 
  });
  const [isEditing, setIsEditing] = useState(false);
  const [generatingDesc, setGeneratingDesc] = useState(false);
  const [productToDelete, setProductToDelete] = useState<Product | null>(null);

  // User Management State
  const [activeUserTab, setActiveUserTab] = useState<Role>(Role.STUDENT);
  const [showAddUser, setShowAddUser] = useState(false);
  const [newUser, setNewUser] = useState({ full_name: '', studentId: '', email: '', balance: '', role: Role.STUDENT });

  useEffect(() => {
    (async () => {
      await loadData();
    })();
  }, []);

  const loadData = async () => {
    setLoading(true);
    setError(null);
    try {
      // Fetch users (profiles)
      const { data: usersData, error: usersError } = await supabase.from('profiles').select('*');
      if (usersError) throw new Error(`Failed to fetch users: ${usersError.message}`);
      setUsers(usersData as User[]);

      // Fetch products
      const { data: productsData, error: productsError } = await supabase.from('products').select('*');
      if (productsError) throw new Error(`Failed to fetch products: ${productsError.message}`);
      setProducts(productsData as Product[]);

      // Fetch transactions (orders)
      const { data: ordersData, error: ordersError } = await supabase
        .from('orders')
        .select(`*, order_items(*, products(*))`);
      if (ordersError) throw new Error(`Failed to fetch orders: ${ordersError.message}`);

      const transformedTransactions = ordersData.map((order: any) => ({
        id: order.id,
        studentId: order.user_id,
        studentName: '', // This would require another join, skipping for now
        items: order.order_items.map((item: any) => ({
          quantity: item.quantity,
          product: item.products,
        })),
        totalAmount: order.total_amount,
        timestamp: order.created_at,
        type: 'PURCHASE',
      }));
      setTransactions(transformedTransactions);

    } catch (e: any) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  };

  const handleTopUp = async (userId: string) => {
    const amount = parseFloat(topUpAmount);
    if (!amount || amount <= 0) return;

    try {
        // 1. Get current balance
        const { data: profile, error: fetchError } = await supabase
            .from('profiles')
            .select('balance')
            .eq('id', userId)
            .single();
        if (fetchError) throw fetchError;

        // 2. Calculate and update new balance
        const newBalance = (profile.balance || 0) + amount;
        const { error: updateError } = await supabase
            .from('profiles')
            .update({ balance: newBalance })
            .eq('id', userId);
        if (updateError) throw updateError;
        
        // 3. Record Transaction in 'orders' table
        const { error: txError } = await supabase
            .from('orders')
            .insert({
                user_id: userId,
                total_amount: amount,
                type: 'TOPUP', // You'll need to add a 'type' column to your 'orders' table
                // items are not relevant for a top-up
            });
        if (txError) throw txError;

        setTopUpAmount('');
        setShowAddMoney(null);
        await loadData(); // Refresh all data
    } catch(e: any) {
        setError(e.message);
    }
  };

  const generateAiInsight = async () => {
    setLoadingAi(true);
    const insight = await GeminiService.analyzeTransactions(transactions);
    setAiInsight(insight || "No insights available.");
    setLoadingAi(false);
  };

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setProductForm(prev => ({ ...prev, image: reader.result as string }));
      };
      reader.readAsDataURL(file);
    }
  };

  const handleCreateProductClick = () => {
    setProductForm({ name: '', price: 0, category: 'Food', image: '', isAvailable: true, stock: 50 });
    setIsEditing(false);
    setShowProductForm(true);
  };

  const handleEditProductClick = (product: Product) => {
    setProductForm({ 
        ...product, 
        isAvailable: product.isAvailable !== undefined ? product.isAvailable : true,
        stock: product.stock !== undefined ? product.stock : 0
    });
    setIsEditing(true);
    setShowProductForm(true);
  };

  const handleSaveProduct = async () => {
     console.log("--- handleSaveProduct called ---");
     console.log("Current productForm state:", productForm);

     if (!productForm.name || !productForm.price) {
       console.log("Exiting handleSaveProduct: Product name or price is missing.");
       return;
     }

     try {
        if (isEditing && productForm.id) {
            console.log("Attempting to UPDATE product with ID:", productForm.id, "with data:", productForm);
            const { error } = await supabase
                .from('products')
                .update({
                    name: productForm.name,
                    price: Number(productForm.price),
                    category: productForm.category,
                    description: productForm.description,
                    image: productForm.image,
                    isAvailable: productForm.isAvailable,
                    stock: Number(productForm.stock)
                })
                .eq('id', productForm.id);
            if (error) {
              console.error("Supabase returned an UPDATE error:", error);
              throw error;
            }
            console.log("Product UPDATE successful!");
        } else {
            console.log("Attempting to INSERT new product with data:", productForm);
            // Create new product (this part is confirmed working)
            const { error } = await supabase
                .from('products')
                .insert([{
                    name: productForm.name!,
                    price: Number(productForm.price),
                    category: productForm.category || 'Food',
                    description: productForm.description,
                    image: productForm.image || `https://picsum.photos/200/200?random=${Math.floor(Math.random() * 1000)}`,
                    isAvailable: productForm.isAvailable,
                    stock: Number(productForm.stock)
                }]);
            if (error) {
              console.error("Supabase returned an INSERT error:", error);
              throw error;
            }
            console.log("Product INSERT successful!");
        }

        setShowProductForm(false);
        setProductForm({ name: '', price: 0, category: 'Food', image: '', isAvailable: true, stock: 0 });
        setIsEditing(false);
        await loadData(); // Refresh data
     } catch (e: any) {
        console.error("Caught an exception in handleSaveProduct:", e);
        setError(e.message); // This should display an error in the UI.
     }
  };

  const confirmDeleteProduct = async () => {
    if (productToDelete) {
      try {
        const { error } = await supabase
            .from('products')
            .delete()
            .eq('id', productToDelete.id);
        if (error) throw error;
        
        setProductToDelete(null);
        await loadData(); // Refresh data
      } catch (e: any) {
        setError(e.message);
      }
    }
  };

  const autofillDescription = async () => {
      if (!productForm.name) return;
      setGeneratingDesc(true);
      const desc = await GeminiService.generateProductDescription(productForm.name, productForm.category || 'Food');
      setProductForm(prev => ({ ...prev, description: desc || '' }));
      setGeneratingDesc(false);
  };

  const handleAddUser = async () => {
    // Frontend validation
    if (!newUser.full_name || !newUser.email || !newUser.password) {
      setError("Full name, email, and password are required.");
      return;
    }
    if (newUser.role === Role.STUDENT && !newUser.studentId) {
      setError("Student ID is required for student accounts.");
      return;
    }
    
    setError(''); // Clear previous errors

    try {
      const { data, error } = await supabase.functions.invoke('create-user', {
        body: {
          email: newUser.email,
          password: newUser.password,
          role: newUser.role,
          full_name: newUser.full_name,
          studentId: newUser.studentId,
          balance: newUser.balance,
        },
      });

      if (error) {
        // This could be a network error or a function-specific error
        throw new Error(error.message);
      }

      if (data.error) {
        // This is an error returned from our function logic
        throw new Error(data.error);
      }
      
      // Success
      setShowAddUser(false);
      setNewUser({ full_name: '', studentId: '', email: '', password: '', balance: '', role: Role.STUDENT });
      await loadData(); // Refresh the user list

    } catch (e: any) {
        console.error("Failed to create user:", e);
        setError(e.message);
    }
  };

  // Data prep for chart
  const getChartData = () => {
      const data: Record<string, number> = {};
      transactions.filter(t => t.type === 'PURCHASE').forEach(t => {
          const date = new Date(t.timestamp).toLocaleDateString();
          data[date] = (data[date] || 0) + t.totalAmount;
      });
      return Object.entries(data).map(([name, value]) => ({ name, value })).slice(-7); // Last 7 days
  };

  // Logic for Top 5 Products
  const getTopProducts = () => {
    const counts: Record<string, number> = {};
    
    transactions.forEach(t => {
      if (t.type === 'PURCHASE') {
        t.items.forEach(item => {
           // item.product.id is the key
           const id = item.product.id;
           counts[id] = (counts[id] || 0) + item.quantity;
        });
      }
    });

    return Object.entries(counts)
      .map(([id, count]) => {
        // Find current product details to get latest image/name
        const product = products.find(p => p.id === id);
        
        // Fallback info from transactions if product was deleted but still has history
        let name = product?.name;
        let image = product?.image;
        let price = product?.price;
        
        if (!name) {
             const foundInTx = transactions
                .flatMap(t => t.items)
                .find(i => i.product.id === id);
             if (foundInTx) {
                 name = foundInTx.product.name;
                 image = foundInTx.product.image;
                 price = foundInTx.product.price;
             }
        }

        return {
          id,
          name: name || 'Unknown Product',
          image,
          price: price || 0,
          count
        };
      })
      .sort((a, b) => b.count - a.count)
      .slice(0, 5);
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-96">
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
      {view === 'admin_dashboard' && (
          <div className="space-y-6">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100">
                    <div className="flex justify-between items-center mb-6">
                        <h3 className="text-lg font-bold text-slate-800">Sales Overview</h3>
                        <TrendingUp size={20} className="text-slate-400" />
                    </div>
                    <div className="h-64">
                        <ResponsiveContainer width="100%" height="100%">
                            <BarChart data={getChartData()}>
                                <XAxis dataKey="name" fontSize={12} tickLine={false} axisLine={false} />
                                <YAxis fontSize={12} tickLine={false} axisLine={false} tickFormatter={(val) => `₱${val}`}/>
                                <Tooltip cursor={{fill: '#f1f5f9'}} contentStyle={{borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)'}} />
                                <Bar dataKey="value" fill="#6366f1" radius={[4, 4, 0, 0]} barSize={40} />
                            </BarChart>
                        </ResponsiveContainer>
                    </div>
                </div>

                <div className="bg-gradient-to-br from-slate-800 to-slate-900 text-white p-6 rounded-2xl shadow-lg relative overflow-hidden">
                    <div className="relative z-10">
                        <h3 className="text-lg font-bold mb-4 flex items-center gap-2">
                            <Sparkles className="text-yellow-400" /> AI Insights
                        </h3>
                        <div className="min-h-[100px] text-slate-300 text-sm leading-relaxed">
                            {loadingAi ? (
                                <div className="animate-pulse space-y-3 mt-2">
                                    <div className="h-2 bg-slate-600 rounded col-span-2 w-3/4"></div>
                                    <div className="h-2 bg-slate-600 rounded col-span-1"></div>
                                    <div className="h-2 bg-slate-600 rounded col-span-1 w-5/6"></div>
                                </div>
                            ) : (
                                aiInsight ? aiInsight : "Click generate to analyze recent transaction patterns and product performance."
                            )}
                        </div>
                        <button
                            onClick={generateAiInsight}
                            disabled={loadingAi}
                            className="mt-6 px-4 py-2 bg-white/10 hover:bg-white/20 rounded-lg text-sm transition-colors border border-white/10 flex items-center gap-2"
                        >
                            {loadingAi && <Loader2 size={16} className="animate-spin" />}
                            {loadingAi ? 'Analyzing...' : 'Generate Report'}
                        </button>
                    </div>
                    <div className="absolute top-0 right-0 w-64 h-64 bg-indigo-500 rounded-full blur-[100px] opacity-20 -mr-16 -mt-16"></div>
                </div>
            </div>

            {/* Top Products Section */}
            <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100">
                <h3 className="text-lg font-bold text-slate-800 mb-6 flex items-center gap-2">
                    <Trophy className="text-yellow-500" size={20} /> 
                    Top 5 Products by Sales
                </h3>
                {getTopProducts().length === 0 ? (
                    <div className="text-center py-8 text-slate-400 text-sm">
                        No sales data available yet.
                    </div>
                ) : (
                    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
                        {getTopProducts().map((product, index) => (
                            <div key={product.id} className="bg-slate-50 rounded-xl p-3 border border-slate-100 flex flex-col items-center text-center relative overflow-hidden group hover:shadow-md transition-shadow">
                                <div className="absolute top-0 left-0 bg-yellow-400 text-yellow-900 text-xs font-bold px-2 py-1 rounded-br-lg z-10 shadow-sm">
                                    #{index + 1}
                                </div>
                                <div className="w-20 h-20 rounded-lg bg-white mb-3 overflow-hidden shadow-sm">
                                    <ProductImage src={product.image} alt={product.name} />
                                </div>
                                <h4 className="font-semibold text-slate-800 text-sm line-clamp-1 w-full" title={product.name}>{product.name}</h4>
                                <div className="mt-2 text-xs text-slate-500">
                                    <span className="block font-bold text-indigo-600 text-lg">{product.count}</span>
                                    <span>units sold</span>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>
          </div>
      )}

      {view === 'users' && (
          <div className="space-y-4">
             <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
               <div>
                 <h3 className="text-lg font-bold text-slate-800">Manage Users</h3>
                 <p className="text-slate-500 text-sm">Create and manage student and staff accounts.</p>
               </div>
               <button 
                  onClick={() => setShowAddUser(true)}
                  className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors"
                >
                    <UserPlus size={16} /> Add New User
                </button>
             </div>

            {/* Tabs */}
            <div className="flex space-x-1 bg-slate-100 p-1 rounded-lg w-fit">
                <button
                    onClick={() => setActiveUserTab(Role.STUDENT)}
                    className={`px-4 py-2 text-sm font-medium rounded-md transition-colors ${activeUserTab === Role.STUDENT ? 'bg-white text-indigo-700 shadow-sm' : 'text-slate-600 hover:text-slate-800'}`}
                >
                    Students
                </button>
                <button
                    onClick={() => setActiveUserTab(Role.STAFF)}
                    className={`px-4 py-2 text-sm font-medium rounded-md transition-colors ${activeUserTab === Role.STAFF ? 'bg-white text-indigo-700 shadow-sm' : 'text-slate-600 hover:text-slate-800'}`}
                >
                    Staff
                </button>
            </div>

             {showAddUser && (
                 <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 animate-in slide-in-from-top-2">
                     <div className="flex justify-between items-center mb-4">
                        <h4 className="font-bold text-slate-700">Add New User</h4>
                        <button onClick={() => setShowAddUser(false)} className="text-slate-400 hover:text-slate-600 text-xl leading-none">&times;</button>
                     </div>
                     <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="md:col-span-2">
                            <label className="block text-xs font-medium text-slate-500 mb-1">Account Role</label>
                            <div className="flex gap-4">
                                <label className="flex items-center gap-2 cursor-pointer">
                                    <input 
                                        type="radio" 
                                        name="role" 
                                        checked={newUser.role === Role.STUDENT} 
                                        onChange={() => setNewUser({...newUser, role: Role.STUDENT})}
                                        className="text-indigo-600"
                                    />
                                    <span className="text-sm">Student</span>
                                </label>
                                <label className="flex items-center gap-2 cursor-pointer">
                                    <input 
                                        type="radio" 
                                        name="role" 
                                        checked={newUser.role === Role.STAFF} 
                                        onChange={() => setNewUser({...newUser, role: Role.STAFF})}
                                        className="text-indigo-600"
                                    />
                                    <span className="text-sm">Staff</span>
                                </label>
                            </div>
                        </div>

                                                 <input
                                                     type="text"
                                                     placeholder="Full Name"
                                                     className="p-2 border rounded"
                                                     value={newUser.full_name}
                                                     onChange={e => setNewUser({...newUser, full_name: e.target.value})}
                                                 />                         
                         <input
                             type="email"
                             placeholder="Email Address"
                             className="p-2 border rounded"
                             value={newUser.email}
                             onChange={e => setNewUser({...newUser, email: e.target.value})}
                         />

                         <input
                             type="password"
                             placeholder="Set Initial Password"
                             className="p-2 border rounded md:col-span-2"
                             value={newUser.password}
                             onChange={e => setNewUser({...newUser, password: e.target.value})}
                         />

                         {newUser.role === Role.STUDENT && (
                            <>
                                <input
                                    type="text"
                                    placeholder="Student ID (e.g. 2024003)"
                                    className="p-2 border rounded"
                                    value={newUser.studentId}
                                    onChange={e => setNewUser({...newUser, studentId: e.target.value})}
                                />
                                <input
                                    type="number"
                                    placeholder="Initial Balance"
                                    className="p-2 border rounded"
                                    value={newUser.balance}
                                    onChange={e => setNewUser({...newUser, balance: e.target.value})}
                                />
                            </>
                         )}

                         <div className="md:col-span-2 flex justify-end gap-2 mt-2">
                             <button onClick={() => setShowAddUser(false)} className="px-3 py-1 text-slate-500 hover:text-slate-700">Cancel</button>
                             <button 
                                onClick={handleAddUser} 
                                disabled={!newUser.full_name || !newUser.email || !newUser.password || (newUser.role === Role.STUDENT && !newUser.studentId)}
                                className="px-3 py-1 bg-indigo-600 text-white rounded hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed"
                             >
                                 Create Account
                             </button>
                         </div>
                     </div>
                 </div>
             )}

             <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
                 <table className="w-full text-left text-sm">
                     <thead className="bg-slate-50 text-slate-500 font-medium">
                         <tr>
                             <th className="p-4">Name</th>
                             <th className="p-4">Role</th>
                             <th className="p-4">{activeUserTab === Role.STUDENT ? 'Student ID' : 'Email'}</th>
                             {activeUserTab === Role.STUDENT && <th className="p-4">Balance</th>}
                             {activeUserTab === Role.STUDENT && <th className="p-4 text-right">Actions</th>}
                         </tr>
                     </thead>
                     <tbody className="divide-y divide-slate-100">
                         {users.filter(u => u.role === activeUserTab).map(user => (
                             <tr key={user.id} className="hover:bg-slate-50">
                                 <td className="p-4 font-medium text-slate-800">{user.full_name}</td>
                                 <td className="p-4 text-slate-500 capitalize">{user.role.toLowerCase()}</td>
                                 <td className="p-4 font-mono text-slate-500">
                                     {activeUserTab === Role.STUDENT ? user.studentId : user.email}
                                 </td>
                                 {activeUserTab === Role.STUDENT && (
                                     <>
                                        <td className="p-4 font-bold text-slate-800">₱{user.balance?.toFixed(2)}</td>
                                        <td className="p-4 text-right">
                                            {showAddMoney === user.id ? (
                                                <div className="flex items-center justify-end gap-2">
                                                    <input
                                                        type="number"
                                                        value={topUpAmount}
                                                        onChange={(e) => setTopUpAmount(e.target.value)}
                                                        placeholder="Amount"
                                                        className="w-24 p-1 border rounded text-sm"
                                                        autoFocus
                                                    />
                                                    <button onClick={() => handleTopUp(user.id)} className="text-green-600 hover:text-green-700 font-bold px-2">✓</button>
                                                    <button onClick={() => setShowAddMoney(null)} className="text-slate-400 hover:text-slate-600 px-2">✕</button>
                                                </div>
                                            ) : (
                                                <button
                                                    onClick={() => setShowAddMoney(user.id)}
                                                    className="text-indigo-600 hover:text-indigo-800 font-medium text-xs bg-indigo-50 hover:bg-indigo-100 px-3 py-1.5 rounded-full transition-colors"
                                                >
                                                    + Top Up
                                                </button>
                                            )}
                                        </td>
                                     </>
                                 )}
                             </tr>
                         ))}
                         {users.filter(u => u.role === activeUserTab).length === 0 && (
                            <tr>
                                <td colSpan={5} className="p-8 text-center text-slate-400">
                                    No {activeUserTab.toLowerCase()} accounts found.
                                </td>
                            </tr>
                         )}
                     </tbody>
                 </table>
             </div>
          </div>
      )}

      {view === 'products' && (
          <div className="space-y-4">
              <div className="flex justify-between items-center">
                  <h3 className="text-lg font-bold text-slate-800">Products</h3>
                  <button
                    onClick={handleCreateProductClick}
                    className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors"
                  >
                      <Plus size={16} /> Add Product
                  </button>
              </div>

              {showProductForm && (
                  <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 grid grid-cols-1 md:grid-cols-2 gap-4 animate-in slide-in-from-top-2">
                      <div className="md:col-span-2 flex justify-between items-center mb-2">
                          <h4 className="font-bold text-slate-700">{isEditing ? 'Edit Product' : 'New Product'}</h4>
                          <button onClick={() => setShowProductForm(false)} className="text-slate-400 hover:text-slate-600"><Plus size={24} className="rotate-45" /></button>
                      </div>

                      <input
                          type="text"
                          placeholder="Product Name"
                          className="p-2 border rounded"
                          value={productForm.name}
                          onChange={e => setProductForm({...productForm, name: e.target.value})}
                      />
                      <input
                          type="number"
                          placeholder="Price"
                          className="p-2 border rounded"
                          value={productForm.price}
                          onChange={e => setProductForm({...productForm, price: parseFloat(e.target.value)})}
                      />
                      
                      <div className="md:col-span-2">
                         <label className="block text-xs font-medium text-slate-500 mb-1">Stock Quantity</label>
                         <input
                            type="number"
                            placeholder="Stock Quantity"
                            className="w-full p-2 border rounded"
                            value={productForm.stock}
                            onChange={e => setProductForm({...productForm, stock: parseFloat(e.target.value)})}
                        />
                      </div>

                      {/* Image Upload */}
                      <div className="md:col-span-2">
                        <label className="block text-xs font-medium text-slate-500 mb-1">Product Image</label>
                        <div className="flex items-center gap-4">
                            {productForm.image ? (
                                <img src={productForm.image} alt="Preview" className="w-16 h-16 object-cover rounded-lg border border-slate-200" />
                            ) : (
                                <div className="w-16 h-16 bg-slate-100 rounded-lg flex items-center justify-center border border-slate-200 text-slate-400">
                                    <ImageIcon size={20} />
                                </div>
                            )}
                            <input
                                type="file"
                                accept="image/*"
                                onChange={handleImageUpload}
                                className="block w-full text-sm text-slate-500
                                file:mr-4 file:py-2 file:px-4
                                file:rounded-full file:border-0
                                file:text-xs file:font-semibold
                                file:bg-indigo-50 file:text-indigo-700
                                hover:file:bg-indigo-100"
                            />
                        </div>
                      </div>

                      <div className="md:col-span-2 flex gap-2">
                           <input
                              type="text"
                              placeholder="Description"
                              className="flex-1 p-2 border rounded"
                              value={productForm.description || ''}
                              onChange={e => setProductForm({...productForm, description: e.target.value})}
                          />
                          <button
                            onClick={autofillDescription}
                            disabled={generatingDesc || !productForm.name}
                            className={`text-xs px-3 rounded flex items-center gap-1.5 transition-colors ${generatingDesc ? 'bg-purple-50 text-purple-400 cursor-wait' : 'bg-purple-100 text-purple-700 hover:bg-purple-200'}`}
                          >
                              {generatingDesc ? <Loader2 size={14} className="animate-spin" /> : <Sparkles size={14} />}
                              {generatingDesc ? 'Drafting...' : 'AI Draft'}
                          </button>
                      </div>

                      {/* Availability Toggle */}
                      <div className="md:col-span-2">
                          <label className="flex items-center gap-2 cursor-pointer select-none">
                              <input 
                                  type="checkbox"
                                  checked={productForm.isAvailable}
                                  onChange={e => setProductForm({...productForm, isAvailable: e.target.checked})}
                                  className="w-4 h-4 text-indigo-600 rounded border-slate-300 focus:ring-indigo-500"
                              />
                              <span className="text-sm font-medium text-slate-700">Available for Sale</span>
                          </label>
                      </div>

                      <div className="md:col-span-2 flex justify-end gap-2">
                          <button onClick={() => setShowProductForm(false)} className="px-3 py-1 text-slate-500 hover:bg-slate-100 rounded">Cancel</button>
                          <button onClick={handleSaveProduct} className="px-3 py-1 bg-indigo-600 text-white rounded hover:bg-indigo-700">
                              {isEditing ? 'Update Product' : 'Save Product'}
                          </button>
                      </div>
                  </div>
              )}

              <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-4 gap-4">
                  {products.map(p => (
                      <div key={p.id} className="relative group bg-white p-4 rounded-xl border border-slate-100 hover:shadow-md transition-all flex flex-col">
                          
                          {/* Availability Badge */}
                          {p.isAvailable === false && (
                              <div className="absolute top-4 left-4 z-10 bg-red-500 text-white text-xs font-bold px-2 py-1 rounded shadow-sm">
                                  Unavailable
                              </div>
                          )}

                          {/* Edit & Delete Buttons */}
                          <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity z-10 flex gap-2">
                              <button 
                                onClick={() => handleEditProductClick(p)} 
                                className="p-2 bg-white/90 rounded-full shadow-sm hover:bg-indigo-50 text-indigo-600 hover:text-indigo-800 backdrop-blur-sm transition-colors"
                                title="Edit Product"
                              >
                                  <Pencil size={16} />
                              </button>
                              <button 
                                onClick={() => setProductToDelete(p)} 
                                className="p-2 bg-white/90 rounded-full shadow-sm hover:bg-red-50 text-red-600 hover:text-red-800 backdrop-blur-sm transition-colors"
                                title="Delete Product"
                              >
                                  <Trash2 size={16} />
                              </button>
                          </div>

                          <div className={`w-full h-32 bg-slate-100 rounded-lg mb-3 overflow-hidden ${p.isAvailable === false ? 'opacity-60 grayscale' : ''}`}>
                             <ProductImage src={p.image} alt={p.name} />
                          </div>
                          <h4 className="font-semibold text-slate-800">{p.name}</h4>
                          <p className="text-xs text-slate-500 mb-2">{p.category}</p>
                          <p className="text-xs text-slate-400 mb-3 flex-1">{p.description}</p>
                          
                          <div className="flex justify-between items-center mt-auto pt-3 border-t border-slate-50">
                              <span className="font-bold text-indigo-600">₱{p.price.toFixed(2)}</span>
                              <div className="flex items-center gap-1 text-xs text-slate-500" title="Available Stock">
                                  <Package size={14} />
                                  <span className={p.stock < 10 ? 'text-red-500 font-bold' : ''}>{p.stock}</span>
                              </div>
                          </div>
                      </div>
                  ))}
              </div>
          </div>
      )}

      {/* Delete Confirmation Modal */}
      {productToDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-sm p-4 animate-in fade-in duration-200">
          <div className="bg-white rounded-2xl shadow-xl max-w-sm w-full p-6 animate-in zoom-in-95 duration-200 scale-100">
            <div className="w-12 h-12 bg-red-100 text-red-600 rounded-full flex items-center justify-center mb-4 mx-auto">
              <Trash2 size={24} />
            </div>
            <h3 className="text-lg font-bold text-center text-slate-800 mb-2">Delete Product?</h3>
            <p className="text-sm text-center text-slate-500 mb-6 leading-relaxed">
              Are you sure you want to permanently delete <span className="font-semibold text-slate-800 block mt-1">"{productToDelete.name}"</span>?
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => setProductToDelete(null)}
                className="flex-1 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-medium rounded-xl transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={confirmDeleteProduct}
                className="flex-1 py-2.5 bg-red-600 hover:bg-red-700 text-white font-bold rounded-xl shadow-sm transition-colors"
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
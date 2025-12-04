import React, { useState, useEffect, useRef } from 'react';
import { User, Product, CartItem, Role, Transaction } from '../types';
import { supabase } from '../services/supabase';
import { Scan, Search, CheckCircle, Plus, Minus, CreditCard, Camera, X, AlertCircle } from 'lucide-react';

interface Props {
  user: User;
}

export const StaffPOS: React.FC<Props> = () => {
  const [products, setProducts] = useState<Product[]>([]);
  const [cart, setCart] = useState<CartItem[]>([]);
  const [currentStudentId, setCurrentStudentId] = useState<string>('');
  const [currentStudent, setCurrentStudent] = useState<User | null>(null);
  const [activeTab, setActiveTab] = useState('scan'); // 'scan' | 'shop'
  const [checkoutStatus, setCheckoutStatus] = useState<'idle' | 'success' | 'error'>('idle');
  const [scanError, setScanError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  // Scanner State
  const scannerRef = useRef<any>(null);

  useEffect(() => {
    const fetchProducts = async () => {
        setLoading(true);
        setError(null);
        try {
            const { data, error: dbError } = await supabase
                .from('products')
                .select('*')
                .eq('isAvailable', true);
            
            if (dbError) throw dbError;
            setProducts(data || []);
        } catch (e: any) {
            setError(e.message);
        } finally {
            setLoading(false);
        }
    };
    fetchProducts();
  }, []);

  // Initialize Scanner automatically when in 'scan' tab
  useEffect(() => {
    let isMounted = true;

    if (activeTab === 'scan') {
        setScanError(null);

        const startScanner = async () => {
             // Wait for DOM to definitely be ready
             await new Promise(resolve => setTimeout(resolve, 300));
             if (!isMounted) return;

             const readerId = "reader";
             const readerElement = document.getElementById(readerId);
             
             if (!readerElement) {
                 return;
             }

             // Check library availability
             if (!(window as any).Html5QrcodeScanner) {
                 setScanError("Scanner library not loaded. Please check your internet connection.");
                 return;
             }

             // Cleanup any previous instance attached to this element ID just in case
             try {
                if (scannerRef.current) {
                    await scannerRef.current.clear();
                }
             } catch (e) {
                 // ignore cleanup errors
             }

             if (!isMounted) return;

             try {
                 // 0 corresponds to SCAN_TYPE_CAMERA in the library enum
                 const scanner = new (window as any).Html5QrcodeScanner(
                     readerId,
                     { 
                         fps: 10, 
                         qrbox: { width: 250, height: 250 },
                         aspectRatio: 1.0,
                         showTorchButtonIfSupported: true,
                         rememberLastUsedCamera: true,
                         supportedScanTypes: [0] // Only allow Camera scan, disable file upload
                     },
                     false
                 );

                 scannerRef.current = scanner;

                 scanner.render(
                     (decodedText: string) => {
                         if (!isMounted) return;
                         
                         // Success: Clear scanner and process result
                         scanner.clear().then(() => {
                             if (isMounted) {
                                setCurrentStudentId(decodedText);
                                verifyStudent(decodedText);
                             }
                         }).catch((err: any) => {
                             console.error("Failed to clear scanner", err);
                             // Force proceed even if clear fails
                             if (isMounted) {
                                 setCurrentStudentId(decodedText);
                                 verifyStudent(decodedText);
                             }
                         });
                     },
                     (errorMessage: any) => {
                         // parse error, ignore to avoid console spam
                     }
                 );
             } catch (err) {
                 console.error("Scanner init error", err);
                 if (isMounted) setScanError("Failed to initialize camera. Please allow camera permissions.");
             }
        };

        startScanner();
    }

    // Cleanup function
    return () => {
        isMounted = false;
        if (scannerRef.current) {
            try {
                scannerRef.current.clear().catch((error: any) => {
                    console.warn("Scanner cleanup warning", error);
                });
            } catch (e) {
                // ignore
            }
            scannerRef.current = null;
        }
    };
  }, [activeTab]);

  const verifyStudent = async (studentId: string) => {
    setScanError(null);
    if (!studentId.trim()) {
        setScanError("Please enter a valid Student ID.");
        return;
    }

    try {
        const { data: student, error } = await supabase
            .from('profiles')
            .select('*')
            .eq('student_id', studentId)
            .eq('role', Role.STUDENT)
            .single();

        if (error) throw error;
        
        if (student) {
          setCurrentStudent(student as User);
          setCurrentStudentId(studentId); // Ensure input reflects scanned ID
          setActiveTab('shop');
          setCheckoutStatus('idle');
        } else {
          setScanError(`Student with ID "${studentId}" not found.`);
        }
    } catch (e: any) {
        setScanError(`Student with ID "${studentId}" not found or an error occurred.`);
        console.error(e);
    }
  };

  const handleManualVerify = () => {
      verifyStudent(currentStudentId);
  };

  const addToCart = (product: Product) => {
    if (product.isAvailable === false || product.stock <= 0) return;
    
    setCart(prev => {
      const existing = prev.find(p => p.id === product.id);
      if (existing) {
        if (existing.quantity >= product.stock) return prev; // Cannot exceed stock
        return prev.map(p => p.id === product.id ? { ...p, quantity: p.quantity + 1 } : p);
      }
      return [...prev, { ...product, quantity: 1 }];
    });
  };

  const updateQuantity = (productId: string, delta: number) => {
    setCart(prev => prev.map(p => {
      if (p.id === productId) {
        // Validation for increasing quantity vs stock
        if (delta > 0 && p.quantity >= p.stock) return p;
        return { ...p, quantity: Math.max(0, p.quantity + delta) };
      }
      return p;
    }).filter(p => p.quantity > 0));
  };

  const calculateTotal = () => cart.reduce((sum, item) => sum + (item.price * item.quantity), 0);

  const handleCheckout = async () => {
    if (!currentStudent || cart.length === 0) return;

    // Prepare the items for the RPC call
    const itemsToProcess = cart.map(item => ({
      product_id: item.id,
      quantity: item.quantity
    }));

    try {
      const { data, error } = await supabase.rpc('process_order', {
        p_user_id: currentStudent.id,
        p_items: itemsToProcess,
      });

      if (error) throw error;

      if (data === 'Success') {
        setCheckoutStatus('success');
        setCart([]);
        
        // Refresh student and product data to show new balance and stock
        await verifyStudent(currentStudent.student_id!);
        
        const { data: updatedProducts, error: productsError } = await supabase
            .from('products')
            .select('*')
            .eq('isAvailable', true);
        if (productsError) throw productsError;
        setProducts(updatedProducts || []);

        // Reset after 3 seconds
        setTimeout(() => {
          setCheckoutStatus('idle');
        }, 3000);

      } else {
        // The RPC returned a specific business logic error (e.g., 'Insufficient balance')
        setCheckoutStatus('error');
        // You could display the specific error from `data` to the user
        console.error('Checkout failed:', data);
        setTimeout(() => setCheckoutStatus('idle'), 4000);
      }
    } catch (e: any) {
      console.error('An unexpected error occurred during checkout:', e);
      setCheckoutStatus('error');
      setTimeout(() => setCheckoutStatus('idle'), 4000);
    }
  };

  const resetSession = () => {
      setCurrentStudent(null);
      setCurrentStudentId('');
      setCart([]);
      setActiveTab('scan');
      setCheckoutStatus('idle');
      setScanError(null);
  };

  return (
    <div className="h-[calc(100vh-100px)] flex flex-col md:flex-row gap-6">
      {/* Left Panel: Scan or Product Grid */}
      <div className="flex-1 bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden flex flex-col">
        {/* Header Tabs */}
        <div className="flex border-b border-slate-100">
           <button
             onClick={() => setActiveTab('scan')}
             className={`flex-1 py-4 text-sm font-medium transition-colors ${activeTab === 'scan' ? 'bg-slate-50 text-indigo-600 border-b-2 border-indigo-600' : 'text-slate-500'}`}
           >
             1. Identification
           </button>
           <button
             onClick={() => currentStudent && setActiveTab('shop')}
             disabled={!currentStudent}
             className={`flex-1 py-4 text-sm font-medium transition-colors ${activeTab === 'shop' ? 'bg-slate-50 text-indigo-600 border-b-2 border-indigo-600' : 'text-slate-500 disabled:opacity-50'}`}
           >
             2. Select Items
           </button>
        </div>

        <div className="flex-1 p-6 overflow-y-auto">
            {activeTab === 'scan' ? (
                <div className="h-full flex flex-col items-center justify-start space-y-6 pt-4">
                    <div className="w-full max-w-md flex flex-col items-center animate-in fade-in">
                         <div className="w-full flex justify-between items-center mb-2">
                             <h2 className="text-xl font-bold text-slate-800 flex items-center gap-2">
                                <Scan size={24} className="text-indigo-600"/> Scan Student ID
                             </h2>
                         </div>
                         <p className="text-sm text-slate-500 mb-4 text-center">
                             The camera will automatically detect the student's QR code.
                         </p>
                         
                         {/* Scanner Container */}
                         <div id="reader" className="w-full bg-slate-100 rounded-lg overflow-hidden border border-slate-200 min-h-[300px] shadow-inner"></div>
                    </div>

                    <div className="w-full max-w-sm border-t border-slate-100 pt-6 mt-2">
                        <p className="text-xs text-slate-400 mb-2 uppercase font-bold text-center">Or Enter Manually</p>
                        <div className="flex gap-2 w-full">
                            <input
                                type="text"
                                placeholder="Student ID (e.g. 2024001)"
                                value={currentStudentId}
                                onChange={(e) => {
                                    setCurrentStudentId(e.target.value);
                                    setScanError(null);
                                }}
                                className={`flex-1 p-3 border rounded-lg focus:ring-2 outline-none text-sm ${scanError ? 'border-red-300 focus:ring-red-200' : 'border-slate-300 focus:ring-indigo-500'}`}
                                onKeyDown={(e) => e.key === 'Enter' && handleManualVerify()}
                            />
                            <button
                                onClick={handleManualVerify}
                                className="bg-slate-800 hover:bg-slate-900 text-white px-4 py-2 rounded-lg font-medium transition-colors text-sm"
                            >
                                Verify
                            </button>
                        </div>
                        {scanError && (
                            <div className="flex items-center gap-2 mt-3 text-sm text-red-600 bg-red-50 p-3 rounded-lg animate-in slide-in-from-top-1">
                                <AlertCircle size={16} className="flex-shrink-0" />
                                {scanError}
                            </div>
                        )}
                    </div>
                </div>
            ) : (
                <div>
                   {loading && (
                      <div className="flex justify-center items-center h-64">
                        <div className="animate-spin rounded-full h-16 w-16 border-t-2 border-b-2 border-indigo-500"></div>
                      </div>
                   )}
                   {error && (
                      <div className="bg-red-100 border-l-4 border-red-500 text-red-700 p-4 rounded-lg" role="alert">
                        <p className="font-bold">Error loading products</p>
                        <p>{error}</p>
                      </div>
                   )}
                   {!loading && !error && (
                       <div className="grid grid-cols-2 lg:grid-cols-3 gap-4">
                           {products.map(product => {
                               const isAvailable = product.isAvailable !== false && product.stock > 0;
                               const cartItem = cart.find(c => c.id === product.id);
                               const inCartQty = cartItem ? cartItem.quantity : 0;
                               const remainingStock = product.stock - inCartQty;

                               return (
                                   <button
                                     key={product.id}
                                     onClick={() => addToCart(product)}
                                     disabled={!isAvailable || remainingStock <= 0}
                                     className={`group flex flex-col items-start p-4 border border-slate-200 rounded-xl transition-all text-left bg-white relative overflow-hidden ${!isAvailable || remainingStock <= 0 ? 'opacity-60 cursor-not-allowed grayscale' : 'hover:border-indigo-500 hover:shadow-md'}`}
                                   >
                                      {product.stock <= 0 && (
                                          <div className="absolute top-3 right-3 z-10 bg-red-500 text-white text-[10px] uppercase font-bold px-2 py-0.5 rounded">
                                              Out of Stock
                                          </div>
                                      )}
                                      <div className="w-full h-32 bg-slate-100 rounded-lg mb-3 overflow-hidden relative">
                                        <img src={product.image} alt={product.name} className="w-full h-full object-cover group-hover:scale-105 transition-transform" />
                                      </div>
                                      <h3 className="font-semibold text-slate-800">{product.name}</h3>
                                      <p className="text-sm text-slate-500 mb-2 truncate w-full">{product.description}</p>
                                      <div className="mt-auto w-full flex justify-between items-end">
                                          <p className="font-bold text-indigo-600">₱{product.price.toFixed(2)}</p>
                                          <span className={`text-xs font-medium px-2 py-1 rounded ${remainingStock < 10 ? 'bg-red-50 text-red-600' : 'bg-slate-100 text-slate-600'}`}>
                                              In Stock: {remainingStock}
                                          </span>
                                      </div>
                                   </button>
                               );
                           })}
                       </div>
                   )}
                </div>
            )}
        </div>
      </div>

      {/* Right Panel: Cart & Checkout */}
      <div className="w-full md:w-96 bg-white rounded-2xl shadow-sm border border-slate-100 flex flex-col h-full">
         <div className="p-6 border-b border-slate-100 bg-slate-50/50">
             <div className="flex justify-between items-start mb-4">
                 <h2 className="text-lg font-bold text-slate-800">Current Session</h2>
                 {currentStudent && (
                     <button onClick={resetSession} className="text-xs text-red-500 hover:text-red-700 font-medium">End Session</button>
                 )}
             </div>

             {currentStudent ? (
                 <div className="bg-white p-3 rounded-lg border border-slate-200 shadow-sm">
                     <p className="text-sm font-semibold text-slate-800">{currentStudent.full_name}</p>
                     <p className="text-xs text-slate-500 mb-2">ID: {currentStudent.studentId}</p>
                     <div className="flex justify-between text-sm">
                         <span className="text-slate-500">Wallet Balance:</span>
                         <span className={`font-bold ${currentStudent.balance && currentStudent.balance < 10 ? 'text-red-500' : 'text-green-600'}`}>
                             ₱{currentStudent.balance?.toFixed(2)}
                         </span>
                     </div>
                 </div>
             ) : (
                 <div className="bg-yellow-50 text-yellow-800 p-3 rounded-lg text-sm border border-yellow-200">
                    No student selected. Please scan ID.
                 </div>
             )}
         </div>

         <div className="flex-1 overflow-y-auto p-4 space-y-3">
             {cart.length === 0 ? (
                 <div className="h-full flex flex-col items-center justify-center text-slate-400">
                     <Search size={32} className="mb-2 opacity-20" />
                     <p>Cart is empty</p>
                 </div>
             ) : (
                 cart.map(item => (
                     <div key={item.id} className="flex items-center justify-between p-2 hover:bg-slate-50 rounded-lg">
                         <div className="flex-1">
                             <p className="text-sm font-medium text-slate-800">{item.name}</p>
                             <p className="text-xs text-slate-500">₱{item.price.toFixed(2)} x {item.quantity}</p>
                         </div>
                         <div className="flex items-center gap-2">
                             <button onClick={() => updateQuantity(item.id, -1)} className="p-1 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded"><Minus size={14}/></button>
                             <span className="text-sm font-medium w-4 text-center">{item.quantity}</span>
                             <button onClick={() => updateQuantity(item.id, 1)} className="p-1 text-slate-400 hover:text-green-500 hover:bg-green-50 rounded"><Plus size={14}/></button>
                         </div>
                     </div>
                 ))
             )}
         </div>

         <div className="p-6 border-t border-slate-100 bg-slate-50/50">
             <div className="flex justify-between items-center mb-4">
                 <span className="text-slate-500">Total</span>
                 <span className="text-2xl font-bold text-slate-900">₱{calculateTotal().toFixed(2)}</span>
             </div>

             {checkoutStatus === 'error' && (
                 <div className="mb-3 p-2 bg-red-100 text-red-700 text-sm rounded-lg text-center flex items-center justify-center gap-2">
                     <AlertCircle size={16}/> Insufficient funds!
                 </div>
             )}
             {checkoutStatus === 'success' && (
                 <div className="mb-3 p-2 bg-green-100 text-green-700 text-sm rounded-lg text-center flex items-center justify-center gap-2">
                     <CheckCircle size={16}/> Payment Successful!
                 </div>
             )}

             <button
               onClick={handleCheckout}
               disabled={!currentStudent || cart.length === 0}
               className="w-full py-3 bg-indigo-600 hover:bg-indigo-700 disabled:bg-slate-300 disabled:cursor-not-allowed text-white rounded-xl font-bold shadow-sm transition-all flex items-center justify-center gap-2"
             >
                 <CreditCard size={18} /> Charge Wallet
             </button>
         </div>
      </div>
    </div>
  );
};
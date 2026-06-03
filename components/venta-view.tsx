'use client'

import { useEffect, useState } from 'react'
import { addMovement, savePendingMovement } from '@/lib/store'
import { useAuth } from '@/lib/auth-context'
import { useInventory } from '@/lib/inventory-context' 
import { Botella } from '@/lib/types'
import { 
  Wine, Zap, History, Search, ShoppingCart, 
  RotateCcw, Layers, Loader2,
  GlassWater, Gift, ChevronUp, ChevronDown, X, CheckCircle2, User
} from 'lucide-react'
import { toast } from 'sonner' 

export function VentaView() {
  const { user } = useAuth()
  const isPrivileged = user?.role === 'owner' 
  
  const { bottles, loading } = useInventory()

  const [search, setSearch] = useState('')
  const [isFinishing, setIsFinishing] = useState(false)
  const [showConfirmModal, setShowConfirmModal] = useState(false)
  const [showFullCartMobile, setShowFullCartMobile] = useState(false)
  const [paymentMethod, setPaymentMethod] = useState<'Efectivo' | 'Transferencia' | 'Tarjeta'>('Efectivo')
  const [transactionRef, setTransactionRef] = useState('')
  const [clientName, setClientName] = useState('')
  const [isCourtesy, setIsCourtesy] = useState(false)
  const [autorizadoPor, setAutorizadoPor] = useState('')

  const AUTORIZADORES = ['Tomas', 'Martin', 'Sofia', 'Valentina', 'Juan', 'Camila']
  const CONSUMO_INTERNO = ['Pública','Trago amigo', 'Personal', 'Trago ingreso', 'Anticipada']

  const [sessionSales, setSessionSales] = useState<{
    id: string, name: string, qty: number, tipo: string, precio: number
  }[]>(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('bar_session_sales')
      return saved ? JSON.parse(saved) : []
    }
    return []
  })

  useEffect(() => {
    localStorage.setItem('bar_session_sales', JSON.stringify(sessionSales))
  }, [sessionSales])

  const checkStockStatus = (item: Botella, currentQtyInCart: number = 0) => {
    const missingIngredients: string[] = [];
    const qtyToValidate = currentQtyInCart + 1;

    if (item.tipo === 'botella') {
      if ((item.stockActual || 0) < qtyToValidate) {
        missingIngredients.push(item.nombre);
      }
    } else if (item.receta && item.receta.length > 0) {
      for (const ing of item.receta) {
        const insumo = bottles.find(b => b.id === ing.productId)
        const totalNeeded = qtyToValidate * Number(ing.cantidad);
        if (!insumo || (Number(insumo.stockActual || 0)) < totalNeeded) {
          missingIngredients.push(insumo?.nombre || "Insumo");
        }
      }
    }
    return { available: missingIngredients.length === 0, missingNames: missingIngredients }
  }

  const handleQuickSale = (item: Botella) => {
    const inCart = sessionSales.find(s => s.id === item.id)?.qty || 0;
    const { available, missingNames } = checkStockStatus(item, inCart)
    
    if (!available) {
      toast.error(`STOCK INSUFICIENTE. Falta: ${missingNames.join(', ')}`, {
        duration: 2000,
        className: "font-black uppercase italic text-[10px] tracking-tighter bg-rose-950 text-rose-200 border-rose-500"
      })
      return
    }

    setSessionSales(prev => {
      const exists = prev.find(s => s.id === item.id)
      if (exists) return prev.map(s => s.id === item.id ? { ...s, qty: s.qty + 1 } : s)
      return [...prev, { id: item.id, name: item.nombre, qty: 1, tipo: item.tipo, precio: item.precio }]
    })

    toast.success(`AÑADIDO: ${item.nombre}`, {
      icon: <CheckCircle2 className="text-emerald-500" size={18} />,
      duration: 800,
      className: "font-black uppercase italic text-[10px] tracking-tighter"
    })
  }

  const handleUndoLocal = (productId: string) => {
    setSessionSales(prev => prev.map(s => s.id === productId ? { ...s, qty: s.qty - 1 } : s).filter(s => s.qty > 0))
  }

  const printTicket = (ticketId: string) => {
    const total = isCourtesy ? 0 : sessionSales.reduce((acc, curr) => acc + (curr.qty * curr.precio), 0);
    const ticketWindow = window.open('', '', 'width=300,height=600');
    if (!ticketWindow) return;

    ticketWindow.document.write(`
      <html>
        <head>
          <title>Ticket ${ticketId}</title>
          <style>
            @page { size: auto; margin: 0mm; }
            body { font-family: 'Courier New', monospace; width: 80mm; padding: 10mm; font-size: 11px; color: #000; line-height: 1.2; }
            .text-center { text-align: center; }
            .header { font-weight: bold; font-size: 18px; margin-bottom: 5px; }
            .divider { border-top: 1px dashed #000; margin: 8px 0; }
            .total { font-weight: bold; font-size: 14px; display: flex; justify-content: space-between; margin-top: 5px; }
          </style>
        </head>
        <body>
          <div class="text-center header">DISCOBAR</div>
          <div class="text-center" style="font-size: 9px; margin-bottom: 5px;">Mendoza, Argentina</div>
          <div class="text-center" style="font-weight: bold; border: 1px solid #000; padding: 2px;">${isCourtesy ? 'INVITACIÓN' : 'TICKET FACTURA'}</div>
          <div class="divider"></div>
          <div style="font-size: 10px; text-transform: uppercase; margin-bottom: 3px;">CAJA: ${user?.name || 'SISTEMA'}</div>
          ${isCourtesy ? `<div style="font-size: 10px; text-transform: uppercase; margin-bottom: 2px;">AUTORIZADO: ${autorizadoPor}</div><div style="font-size: 10px; text-transform: uppercase; margin-bottom: 3px;">PARA: ${clientName}</div>` : ''}
          <div class="divider"></div>
          ${sessionSales.map(item => `
            <div class="item" style="display:flex; justify-content:space-between; margin-bottom:3px;">
              <span>${item.qty} x ${item.name.substring(0, 18)}</span>
              <span>$${(isCourtesy ? 0 : item.qty * item.precio).toLocaleString('es-AR')}</span>
            </div>
          `).join('')}
          <div class="divider"></div>
          <div class="total"><span>TOTAL:</span><span>$${total.toLocaleString('es-AR')}</span></div>
          <div class="text-center" style="font-size: 7px; margin-top: 15px;">Ticket: ${ticketId}</div>
          <script>window.onload = function() { window.print(); setTimeout(() => { window.close(); }, 500); }</script>
        </body>
      </html>
    `);
    ticketWindow.document.close();
  }

  const processFinalSale = async () => {
    if (!isCourtesy && paymentMethod !== 'Efectivo' && !transactionRef) {
       toast.error("Falta el número de comprobante");
       return;
    }
    if (isCourtesy && (!clientName.trim() || !autorizadoPor)) {
      toast.error("Faltan datos del regalo (Autorizador y Destino)");
      return;
    }
    
  
    const finalType = isCourtesy ? 'cortesia' : 'venta';
    const ticketId = `TICK-${Date.now()}`;
    const timestamp = new Date().toISOString();

    setShowConfirmModal(false);
    setIsFinishing(true);
    printTicket(ticketId);

    const extraInfo = (paymentMethod !== 'Efectivo' && transactionRef) ? ` | Ref: ${transactionRef}` : '';
    const paymentLabel = isCourtesy ? 'REGALO' : paymentMethod;
    
    const movementsToSync: any[] = [];

    sessionSales.forEach(sale => {
      const item = bottles.find(b => b.id === sale.id);
      if (!item) return;

      // 1. REGISTRO DEL COMBO 
      movementsToSync.push({
        botellaId: sale.id,
        nombreBotella: sale.name,
        tipo: finalType, 
        cantidad: sale.qty,
        monto: isCourtesy ? 0 : sale.precio * sale.qty,
        usuarioId: user?.id || 'admin',
        nombreUsuario: user?.name || 'Caja',
        notas: `Ticket: ${ticketId} | Pago: ${paymentLabel}${extraInfo}`,
        autorizadoPor: isCourtesy ? autorizadoPor : null,
        beneficiario: isCourtesy ? clientName : null,
        createdAt: timestamp,
        esInsumo: false 
      });

      // 2. REGISTRO DE INGREDIENTES 
      if ((item.tipo === 'combo' || item.tipo === 'trago') && item.receta) {
        item.receta.forEach(ing => {
          const insumoData = bottles.find(b => b.id === ing.productId);
          movementsToSync.push({
            botellaId: ing.productId,
            nombreBotella: insumoData?.nombre || 'Insumo',
            tipo: finalType, 
            cantidad: Number(ing.cantidad) * sale.qty,
            monto: 0,
            usuarioId: user?.id || 'admin',
            nombreUsuario: user?.name || 'Caja',
            notas: `HIDE_FROM_HISTORY | Insumo de: ${item.nombre} | Ticket: ${ticketId}`,
            autorizadoPor: isCourtesy ? autorizadoPor : null,
            beneficiario: isCourtesy ? clientName : null,
            createdAt: timestamp,
            esInsumo: true 
          });
        });
      }
    });

    setSessionSales([]);
    localStorage.removeItem('bar_session_sales');

    try {
      const promises = movementsToSync.map(m => 
        addMovement(m.botellaId, m.tipo as any, m.cantidad, m.usuarioId, m.nombreUsuario, m.notas, timestamp, undefined, undefined, m.autorizadoPor, m.beneficiario, m.monto, m.esInsumo)
      );
      await Promise.all(promises);
      toast.success(finalType === 'cortesia' ? "Regalo registrado con éxito" : "Venta finalizada");
    } catch (e) {
      movementsToSync.forEach(m => savePendingMovement(m));
      toast.warning("Guardado offline");
    } finally {
      setIsFinishing(false);
      setIsCourtesy(false);
      setShowFullCartMobile(false);
      setTransactionRef('');
      setClientName('');
      setAutorizadoPor('');
      setPaymentMethod('Efectivo');
    }
  };

  const filteredItems = bottles.filter(b => 
    (b.nombre || "").toLowerCase().includes(search.toLowerCase()) || 
    (b.marca || "").toLowerCase().includes(search.toLowerCase())
  )

  const totalAmount = isCourtesy ? 0 : sessionSales.reduce((acc, curr) => acc + (curr.qty * curr.precio), 0)
  const totalItemsInComanda = sessionSales.reduce((acc, curr) => acc + curr.qty, 0)
  const lowStockCount = bottles.filter(b => b.tipo === 'botella' && (b.stockActual || 0) <= (b.stockMinimo || 0)).length;

  if (loading) return (
    <div className="h-screen flex items-center justify-center bg-[#0f172a]">
       <Loader2 className="w-10 h-10 text-indigo-500 animate-spin" />
    </div>
  )

  return (
    <div className="h-[calc(100vh-140px)] flex flex-col lg:flex-row gap-8 font-rounded animate-in fade-in duration-500 overflow-hidden relative">
      <div className="flex-[2] flex flex-col space-y-6 min-h-0 pb-32 lg:pb-0">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 shrink-0 px-2">
          <div className="flex items-center gap-4">
            <div className="p-4 bg-indigo-500/20 rounded-[1.5rem] text-indigo-400"><Zap className="w-8 h-8 fill-current" /></div>
            <div>
              <h1 className="text-3xl font-black text-white uppercase italic tracking-tighter leading-none">VENTA</h1>
              {lowStockCount > 0 && <p className="text-[10px] text-amber-500 font-bold uppercase mt-1 animate-pulse italic">Hay {lowStockCount} productos con stock bajo</p>}
            </div>
          </div>
          <div className="relative w-full md:w-72">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500" size={18} />
            <input type="text" placeholder="BUSCAR..." value={search} onChange={(e) => setSearch(e.target.value)} className="w-full pl-12 pr-6 py-4 bg-slate-900/50 border-2 border-slate-800 rounded-[1.8rem] text-white outline-none focus:border-indigo-500 font-bold uppercase" />
          </div>
        </div>

        <div className="flex-1 overflow-y-auto pr-2 space-y-10 custom-scrollbar pb-10 px-2">
          {[
            { tipo: 'trago', label: 'Tragos y Recetas', icon: <GlassWater className="text-sky-400" /> },
            { tipo: 'combo', label: 'Combos y Promos', icon: <Layers className="text-purple-400" /> },
            { tipo: 'botella', label: 'Botellas y Unidades', icon: <Wine className="text-rose-400" /> }
          ].map((section) => {
            const items = filteredItems.filter(b => b.tipo === section.tipo && Number(b.precio) > 0)
            if (items.length === 0) return null
            return (
              <div key={section.tipo} className="space-y-4">
                <div className="flex items-center gap-3 px-2">
                  {section.icon}
                  <h2 className="text-[10px] font-black text-white uppercase tracking-[0.2em] italic">{section.label}</h2>
                  <div className="flex-1 h-[1px] bg-slate-800" />
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-4 gap-4">
                  {items.map(bottle => (
                    <ItemButton 
                      key={bottle.id} 
                      bottle={bottle} 
                      status={checkStockStatus(bottle, sessionSales.find(s => s.id === bottle.id)?.qty || 0)} 
                      onClick={() => handleQuickSale(bottle)} 
                      variant={section.tipo as any} 
                    />
                  ))}
                </div>
              </div>
            )
          })}
        </div>
      </div>

      <div className={`fixed bottom-0 left-0 right-0 z-40 transition-all duration-500 bg-slate-950 lg:relative lg:flex-1 lg:h-full lg:bg-slate-900/30 border-t-4 lg:border-t-0 lg:border-2 border-slate-800 lg:rounded-[1rem] flex flex-col overflow-hidden shadow-2xl ${showFullCartMobile ? 'h-[80vh]' : 'h-20 lg:h-full'}`}>
        <div className="lg:hidden w-full flex justify-center py-2 cursor-pointer" onClick={() => setShowFullCartMobile(!showFullCartMobile)}>
          <div className="w-12 h-1.5 bg-slate-700 rounded-full" />
        </div>
        <div className="p-4 lg:p-8 border-b-1 border-slate-800 bg-indigo-500/5 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <History className="w-5 h-5 text-indigo-400" />
            <h2 className="font-bold text-white uppercase tracking-widest text-xs italic">Comanda</h2>
            <span className="bg-indigo-600 text-white text-[10px] font-black px-2 py-0.5 rounded-full shadow-lg">{totalItemsInComanda} ITEMS</span>
          </div>
          <div className="flex items-center gap-4">
            {sessionSales.length > 0 && <button onClick={() => {setSessionSales([]); setIsCourtesy(false)}} className="text-rose-500 p-1 hover:bg-rose-500/10 rounded-lg transition-colors"><RotateCcw size={20}/></button>}
            <div className="lg:hidden" onClick={() => setShowFullCartMobile(!showFullCartMobile)}>{showFullCartMobile ? <ChevronDown /> : <ChevronUp />}</div>
          </div>
        </div>
        <div className={`flex-1 overflow-y-auto p-6 space-y-3 custom-scrollbar ${!showFullCartMobile && 'hidden lg:block'}`}>
          {sessionSales.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center text-slate-800 space-y-4 opacity-20"><ShoppingCart className="w-16 h-16" /><p className="text-xs font-black uppercase italic tracking-widest">Vacío</p></div>
          ) : (
            sessionSales.map((sale) => (
              <div key={sale.id} className="group flex items-center justify-between bg-slate-900/80 p-5 rounded-[2.2rem] border border-slate-800 transition-all hover:border-indigo-500/50">
                <div className="min-w-0 pr-4">
                  <p className="font-black text-slate-200 text-[11px] uppercase truncate italic">{sale.name}</p>
                  <p className="text-[15px] text-emerald-500 font-bold mt-1">${(sale.precio * sale.qty).toLocaleString()}</p>
                </div>
                <div className="flex items-center gap-3">
                  <button onClick={() => handleUndoLocal(sale.id)} className="p-2 text-rose-500 hover:bg-rose-500/10 rounded-xl transition-all"><X size={18} /></button>
                  <div className="bg-indigo-600 text-white font-black px-4 py-2 rounded-2xl text-xl shadow-lg">x{sale.qty}</div>
                </div>
              </div>
            ))
          )}
        </div>
        <div className="p-6 lg:p-8 bg-slate-900 border-t-2 border-slate-800 shrink-0">
          {isPrivileged && sessionSales.length > 0 && (
            <button onClick={() => setIsCourtesy(!isCourtesy)} className={`w-full mb-4 py-3 rounded-xl border-2 transition-all flex items-center justify-center gap-2 font-black text-[10px] uppercase italic tracking-widest ${isCourtesy ? 'bg-purple-600 border-purple-400 text-white shadow-lg shadow-purple-900/20' : 'bg-slate-800 border-slate-700 text-slate-500'}`}><Gift size={16} /> {isCourtesy ? 'MARCADO COMO REGALO' : 'MARCAR COMO REGALO'}</button>
          )}
          <div className="flex justify-between items-end mb-6 px-2">
            <div className="flex flex-col"><span className="text-slate-500 font-bold uppercase text-[9px] tracking-[0.2em]">Total Final</span><div className="flex items-baseline gap-2"><span className={`text-4xl font-black italic tracking-tighter transition-all ${isCourtesy ? 'text-purple-400 line-through opacity-40' : 'text-white'}`}>${totalAmount.toLocaleString()}</span>{isCourtesy && <span className="text-3xl font-black text-purple-400 italic animate-pulse">$0</span>}</div></div>
          </div>
          <button onClick={() => sessionSales.length > 0 && setShowConfirmModal(true)} disabled={isFinishing || sessionSales.length === 0} className={`w-full py-6 font-black rounded-[1.8rem] flex items-center justify-center gap-3 transition-all text-xl uppercase italic shadow-2xl active:scale-95 disabled:opacity-30 ${isCourtesy ? 'bg-purple-600 text-white shadow-purple-900/40' : 'bg-emerald-600 text-white shadow-emerald-900/40'}`}>{isFinishing ? <Loader2 size={24} className="animate-spin" /> : isCourtesy ? <Gift /> : <Zap className="fill-current" />} {isFinishing ? 'PROCESANDO...' : 'FINALIZAR'}</button>
        </div>
      </div>

      {showConfirmModal && (
        <div className="fixed inset-0 bg-slate-950/95 backdrop-blur-md z-[999] flex items-center justify-center p-4">
          <div className="bg-slate-900 border-2 border-slate-800 rounded-[3rem] w-full max-w-md p-8 shadow-2xl animate-in zoom-in duration-300">
            <div className="flex flex-col items-center mb-6">
               <div className={`p-4 rounded-2xl mb-4 ${isCourtesy ? 'bg-purple-500/20 text-purple-400' : 'bg-emerald-500/20 text-emerald-400'}`}>{isCourtesy ? <Gift size={32}/> : <User size={32}/>}</div>
               <h2 className="text-2xl font-black text-white uppercase italic text-center leading-tight tracking-tighter">{isCourtesy ? 'Detalle del Regalo' : 'Confirmar Cobro'}</h2>
               <p className="text-[10px] text-slate-500 font-bold uppercase mt-1 italic tracking-widest">Operador: {user?.name || 'SISTEMA'}</p>
            </div>
            {!isCourtesy && (
              <div className="grid grid-cols-3 gap-3 mb-8">
                {['Efectivo', 'Transferencia', 'Tarjeta'].map((m) => (
                  <button key={m} onClick={() => setPaymentMethod(m as any)} className={`p-4 rounded-2xl border-2 transition-all active:scale-95 ${paymentMethod === m ? 'bg-indigo-600 border-indigo-400 text-white shadow-lg' : 'bg-slate-800/50 border-slate-700 text-slate-500 hover:border-slate-500'}`}><span className="text-[8px] font-black uppercase tracking-tighter">{m}</span></button>
                ))}
              </div>
            )}
            <div className="space-y-4 mb-6">
                {!isCourtesy && paymentMethod !== 'Efectivo' && <div className="space-y-1"><label className="text-[9px] font-black text-slate-500 uppercase ml-2 tracking-widest italic">Referencia</label><input type="text" placeholder="REF..." value={transactionRef} onChange={(e) => setTransactionRef(e.target.value)} className="w-full bg-slate-950 border-2 border-slate-800 p-4 rounded-2xl text-white font-bold outline-none focus:border-indigo-500 transition-all uppercase" /></div>}
                {isCourtesy && <div className="space-y-1"><label className="text-[9px] font-black text-indigo-400 uppercase ml-2 italic tracking-widest">Autorizado por:</label><select value={autorizadoPor} onChange={(e) => setAutorizadoPor(e.target.value)} className="w-full bg-slate-950 border-2 border-slate-800 p-4 rounded-2xl text-white font-bold outline-none uppercase text-xs focus:border-purple-500 transition-all"><option value="">SELECCIONAR...</option>{AUTORIZADORES.map(auth => <option key={auth} value={auth}>{auth}</option>)}</select></div>}
                <div className="space-y-1">
                  <label className="text-[9px] font-black text-slate-500 uppercase ml-2 tracking-widest italic">{isCourtesy ? 'PARA QUIÉN ES EL REGALO?' : 'NOMBRE DEL CLIENTE'}</label>
                  {isCourtesy ? (
                    <select value={clientName} onChange={(e) => setClientName(e.target.value)} className="w-full bg-slate-950 border-2 border-slate-800 p-4 rounded-2xl text-white font-bold uppercase text-xs focus:border-rose-500 transition-all"><option value="">ELEGIR DESTINO...</option>{CONSUMO_INTERNO.map(dest => <option key={dest} value={dest}>{dest}</option>)}</select>
                  ) : (
                    <input type="text" placeholder="ESCRIBIR NOMBRE..." value={clientName} onChange={(e) => setClientName(e.target.value)} className="w-full bg-slate-950 border-2 border-slate-800 p-4 rounded-2xl text-white font-bold outline-none focus:border-indigo-500 transition-all uppercase" />
                  )}
                </div>
            </div>
            <div className="flex w-full gap-3">
              <button onClick={() => setShowConfirmModal(false)} className="flex-1 py-4 bg-slate-800 text-slate-400 font-black rounded-2xl uppercase text-[10px] italic hover:bg-slate-700 transition-all">CANCELAR</button>
              <button onClick={processFinalSale} disabled={isFinishing || (isCourtesy && (!autorizadoPor || !clientName.trim()))} className={`flex-[2] py-4 font-black rounded-2xl uppercase text-[10px] transition-all italic shadow-xl active:scale-95 ${isCourtesy ? 'bg-purple-600 text-white shadow-purple-900/20' : 'bg-emerald-600 text-white shadow-emerald-900/40'}`}>CONFIRMAR</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

function ItemButton({ bottle, status, onClick, variant }: { bottle: Botella, status: { available: boolean, missingNames: string[] }, onClick: () => void, variant: any }) {
  const Icon = (variant === 'receta' || variant === 'trago') ? GlassWater : variant === 'combo' ? Layers : Wine
  const isOut = !status.available
  const isBottle = bottle.tipo === 'botella';
  const stockActual = Number(bottle.stockActual || 0);
  const stockMinimo = Number(bottle.stockMinimo || 0);
  const isLow = !isOut && isBottle && stockMinimo > 0 && stockActual <= stockMinimo;

  return (
    <button disabled={isOut} onClick={onClick} className={`group relative aspect-square rounded-[2.2rem] border-2 transition-all active:scale-95 flex flex-col items-center justify-center p-4 text-center ${isOut ? 'bg-slate-900/20 border-rose-500/20 grayscale opacity-50' : isLow ? 'bg-amber-500/5 border-amber-500/40 shadow-lg' : 'bg-slate-900/40 border-slate-800 hover:border-indigo-500/50 hover:bg-slate-900/60 transition-all'}`}>
      {isLow && <span className="absolute top-4 right-4 flex h-2 w-2"><span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-75"></span><span className="relative inline-flex rounded-full h-2 w-2 bg-amber-500"></span></span>}
      <div className={`w-12 h-12 rounded-2xl flex items-center justify-center border-2 mb-3 transition-colors ${isOut ? 'text-rose-500/40 border-rose-500/10' : 'text-indigo-400 border-slate-800 group-hover:border-indigo-500/50'}`}><Icon className="w-6 h-6" /></div>
      <p className={`font-bold text-[10px] uppercase truncate italic leading-tight px-1 ${isOut ? 'text-slate-600' : 'text-white'}`}>{bottle.nombre}</p>
      {isOut ? <span className="text-[10px] font-black text-rose-500 mt-2 block italic uppercase tracking-tighter">Falta: {status.missingNames[0] || 'Insumo'}</span> : <p className="text-[15px] font-black mt-2 text-slate-500 group-hover:text-indigo-400 transition-colors">${bottle.precio?.toLocaleString()}</p>}
    </button>
  )
}
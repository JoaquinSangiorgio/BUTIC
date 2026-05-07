'use client'

import React, { useState, useMemo } from 'react'
import { 
  Search, Clock, ShoppingBag, Download, 
  UserCheck, Filter, ChevronRight, Zap, Gift, BarChart3 
} from 'lucide-react'

interface Props {
  startDate: string
  endDate: string
  reportData: any
}

export function VentasDetalleView({ startDate, endDate, reportData }: Props) {
  const [searchTerm, setSearchTerm] = useState('')
  const [selectedCategory, setSelectedCategory] = useState<string>('TODAS')
  const [filterAuthorizer, setFilterAuthorizer] = useState('TODOS')

  const [fechaCorresponde, setFechaCorresponde] = useState(startDate)
  const [horaInicio, setHoraInicio] = useState(6)
  const [horaFin, setHoraFin] = useState(21)

  const movements = reportData?.movements || []

  // ✅ LÓGICA DE CATEGORÍAS Y AUTORIZADORES
  const categorias = useMemo<string[]>(() => {
    const cats: string[] = movements.map((m: any): string => (m.categoria?.toUpperCase() || 'OTROS'))
    return ['TODAS', ...Array.from(new Set<string>(cats))]
  }, [movements])

  const autorizadores = useMemo<string[]>(() => {
    const auths = movements
      .filter((m: any) => m.tipo === 'cortesia' && m.autorizadoPor)
      .map((m: any) => m.autorizadoPor as string)
    return ['TODOS', ...Array.from(new Set<string>(auths))]
  }, [movements])

  // 🔥 PROCESAMIENTO DE DATOS
  const groupedSales = useMemo(() => {
    const startTimestamp = new Date(`${startDate}T${horaInicio.toString().padStart(2, '0')}:00:00`).getTime()
    const endTimestamp = new Date(`${endDate}T${horaFin.toString().padStart(2, '0')}:59:59`).getTime()

    const agrupados: Record<string, any> = {}

    movements.forEach((m: any) => {
      if (m.esInsumo === true || m.notas?.includes('HIDE_FROM_HISTORY')) return
      if (m.tipo !== 'venta' && m.tipo !== 'cortesia') return

      const ticketTimestamp = new Date(m.createdAt).getTime()
      const pasaTiempo = ticketTimestamp >= startTimestamp && ticketTimestamp <= endTimestamp
      const pasaCategoria = selectedCategory === 'TODAS' || m.categoria?.toUpperCase() === selectedCategory
      const pasaBusqueda = (m.nombreBotella || '').toLowerCase().includes(searchTerm.toLowerCase())

      if (!pasaTiempo || !pasaCategoria || !pasaBusqueda) return

      const cantidadMov = Math.abs(Number(m.cantidad || 0))
      const montoMov = Number(m.monto || 0)
      const esRegalo = m.tipo === 'cortesia'
      const autorizadorFinal = m.autorizadoPor || 'S/A'

      if (filterAuthorizer !== 'TODOS' && autorizadorFinal !== filterAuthorizer) return

      const id = m.botellaId
      if (!agrupados[id]) {
        agrupados[id] = {
          name: m.nombreBotella,
          salesCount: 0,
          courtesyCount: 0,
          totalMoney: 0,
          cat: m.categoria || 'OTROS',
          breakdown: {} as Record<string, number>
        }
      }

      if (esRegalo) {
        agrupados[id].courtesyCount += cantidadMov
        agrupados[id].breakdown[autorizadorFinal] = (agrupados[id].breakdown[autorizadorFinal] || 0) + cantidadMov
      } else {
        agrupados[id].salesCount += cantidadMov
        agrupados[id].totalMoney += montoMov
      }
    })

    return Object.values(agrupados).sort((a: any, b: any) => 
      (b.salesCount + b.courtesyCount) - (a.salesCount + a.courtesyCount)
    )
  }, [movements, startDate, endDate, horaInicio, horaFin, selectedCategory, searchTerm, filterAuthorizer])

  const handleExportResumen = () => {
    let csvContent = "Producto;Categoria;Ventas;Regalos;Subtotal\n"
    groupedSales.forEach((item: any) => {
      csvContent += `${item.name};${item.cat};${item.salesCount};${item.courtesyCount};${item.totalMoney}\n`
    })
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement("a")
    link.setAttribute("href", url)
    link.setAttribute("download", `Auditoria_Wish_${fechaCorresponde}.csv`)
    link.click()
  }

  return (
    <div className="space-y-8 animate-in fade-in duration-700 pb-24 font-rounded">
      
      {/* --- SECCIÓN HEADER --- */}
      <div className="bg-slate-900/40 p-8 rounded-[3rem] border-2 border-slate-800/50 backdrop-blur-xl shadow-2xl">
        <div className="flex flex-col xl:flex-row gap-8 justify-between items-start xl:items-center">
          
          <div className="flex items-center gap-6">
            <div className="p-4 bg-indigo-500/20 rounded-[1.8rem] text-indigo-400 border border-indigo-500/30">
              <BarChart3 size={32} />
            </div>
            <div>
              <h2 className="text-3xl font-black uppercase italic tracking-tighter text-white leading-none">
                Auditoría <span className="text-indigo-500">Detalle</span>
              </h2>
              <div className="flex items-center gap-2 mt-2">
                <Clock size={12} className="text-slate-500" />
                <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest italic">
                  Rango de Control: {horaInicio}:00hs - {horaFin}:00hs
                </span>
              </div>
            </div>
          </div>

          <div className="flex flex-wrap gap-3 w-full xl:w-auto">
            {/* INPUT BUSCAR ESTILIZADO */}
            <div className="relative flex-1 min-w-[200px]">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500" size={18} />
              <input
                type="text"
                placeholder="FILTRAR PRODUCTO..."
                className="w-full pl-12 pr-4 py-4 bg-slate-950 border-2 border-slate-800 rounded-2xl text-white font-bold text-xs outline-none focus:border-indigo-500 transition-all placeholder:text-slate-700 uppercase"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>

            <button 
              onClick={handleExportResumen}
              className="p-4 bg-emerald-500/10 border-2 border-emerald-500/20 text-emerald-500 rounded-2xl hover:bg-emerald-500 hover:text-white transition-all active:scale-90"
            >
              <Download size={20} />
            </button>
          </div>
        </div>

        {/* --- FILTROS SECUNDARIOS --- */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-8 pt-8 border-t border-slate-800/50">
          
          <div className="space-y-2">
            <label className="text-[9px] font-black text-slate-500 uppercase ml-2 tracking-widest italic">Fecha Auditoría</label>
            <input
              type="date"
              value={fechaCorresponde}
              onChange={(e) => setFechaCorresponde(e.target.value)}
              className="w-full bg-slate-950 border-2 border-slate-800 p-3 rounded-xl text-white font-bold text-xs outline-none focus:border-indigo-500"
            />
          </div>

          <div className="space-y-2">
            <label className="text-[9px] font-black text-slate-500 uppercase ml-2 tracking-widest italic">Categoría</label>
            <select 
              value={selectedCategory} 
              onChange={(e) => setSelectedCategory(e.target.value)}
              className="w-full bg-slate-950 border-2 border-slate-800 p-3 rounded-xl text-white font-bold text-xs outline-none focus:border-indigo-500 uppercase"
            >
              {categorias.map(c => <option key={c} value={c}>{c}</option>)}
            </select>
          </div>

          <div className="space-y-2">
            <label className="text-[9px] font-black text-indigo-400 uppercase ml-2 tracking-widest italic text-center">Filtro Autorización</label>
            <select 
              value={filterAuthorizer} 
              onChange={(e) => setFilterAuthorizer(e.target.value)}
              className="w-full bg-slate-950 border-2 border-indigo-500/20 p-3 rounded-xl text-white font-bold text-xs outline-none focus:border-indigo-500 uppercase"
            >
              {autorizadores.map(a => (
                <option key={a} value={a}>{a === 'TODOS' ? 'TODOS LOS RESPONSABLES' : a}</option>
              ))}
            </select>
          </div>

          <div className="grid grid-cols-2 gap-2">
             <div className="space-y-2">
               <label className="text-[9px] font-black text-slate-500 uppercase ml-2 tracking-widest italic">Inicio</label>
               <select value={horaInicio} onChange={(e) => setHoraInicio(Number(e.target.value))} className="w-full bg-slate-950 border-2 border-slate-800 p-3 rounded-xl text-white font-bold text-xs">
                 {Array.from({ length: 24 }).map((_, i) => (<option key={i} value={i}>{i}:00</option>))}
               </select>
             </div>
             <div className="space-y-2">
               <label className="text-[9px] font-black text-slate-500 uppercase ml-2 tracking-widest italic">Fin</label>
               <select value={horaFin} onChange={(e) => setHoraFin(Number(e.target.value))} className="w-full bg-slate-950 border-2 border-slate-800 p-3 rounded-xl text-white font-bold text-xs">
                 {Array.from({ length: 24 }).map((_, i) => (<option key={i} value={i}>{i}:00</option>))}
               </select>
             </div>
          </div>

        </div>
      </div>

      {/* --- GRID DE RESULTADOS --- */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
        {groupedSales.length > 0 ? (
          groupedSales.map((item: any, i: number) => {
            const totalQty = item.salesCount + item.courtesyCount || 1
            const salesPerc = (item.salesCount / totalQty) * 100
            const giftsPerc = (item.courtesyCount / totalQty) * 100

            return (
              <div key={i} className="group bg-slate-900/60 rounded-[2.5rem] border-2 border-slate-800 hover:border-indigo-500/50 transition-all duration-500 p-8 shadow-xl flex flex-col justify-between">
                
                <div>
                  <div className="flex justify-between items-start mb-4">
                    <span className="px-3 py-1 bg-indigo-500/10 text-indigo-400 text-[8px] font-black uppercase rounded-full border border-indigo-500/20 tracking-tighter">
                      {item.cat}
                    </span>
                    <ChevronRight size={16} className="text-slate-700 group-hover:text-indigo-500 transition-colors" />
                  </div>

                  <h4 className="text-xl font-black text-white uppercase italic tracking-tighter mb-6 group-hover:text-indigo-400 transition-colors">
                    {item.name}
                  </h4>

                  <div className="space-y-4">
                    <div className="flex justify-between items-center">
                      <div className="flex items-center gap-2 text-emerald-500 font-bold text-sm">
                        <Zap size={14} className="fill-current" />
                        <span>VENTAS: {item.salesCount}</span>
                      </div>
                      <span className="text-white font-black text-lg">${item.totalMoney.toLocaleString()}</span>
                    </div>

                    <div className="flex items-center gap-2 text-purple-400 font-bold text-sm">
                      <Gift size={14} />
                      <span>CORTESÍAS: {item.courtesyCount}</span>
                    </div>
                  </div>
                </div>

                {/* BARRA DE PROGRESO PREMIUM */}
                <div className="mt-8">
                  <div className="flex h-3 w-full bg-slate-800/50 rounded-full overflow-hidden border border-slate-700/50">
                    <div 
                      className="bg-gradient-to-r from-emerald-600 to-emerald-400 transition-all duration-1000" 
                      style={{ width: `${salesPerc}%` }}
                    />
                    <div 
                      className="bg-gradient-to-r from-purple-600 to-purple-400 transition-all duration-1000" 
                      style={{ width: `${giftsPerc}%` }}
                    />
                  </div>
                  
                  {/* BREAKDOWN DE RESPONSABLES */}
                  {item.courtesyCount > 0 && (
                    <div className="mt-6 p-4 bg-slate-950/50 rounded-2xl border border-slate-800">
                      <p className="text-[12px] font-black text-slate-500 uppercase tracking-[0.2em] mb-3 italic">Autorizado por:</p>
                      <div className="flex flex-wrap gap-2">
                        {Object.entries(item.breakdown).map(([name, qty]: any) => (
                          <div key={name} className="px-3 py-1 bg-slate-900 rounded-lg border border-slate-800 flex items-center gap-2">
                            <span className="text-[12px] font-black text-white italic">{name}</span>
                            <span className="text-[12px] font-bold text-purple-400">x{qty}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>

              </div>
            )
          })
        ) : (
          <div className="col-span-full py-32 flex flex-col items-center justify-center text-slate-800 opacity-20 italic">
            <ShoppingBag size={80} strokeWidth={1} />
            <p className="mt-4 font-black uppercase tracking-tighter text-2xl">Sin movimientos registrados</p>
          </div>
        )}
      </div>
    </div>
  )
}
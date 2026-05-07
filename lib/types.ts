// ✅ Roles de usuario
export type RolUsuario = 'owner' | 'employee'

// ✅ Usuario
export interface Usuario {
  id: string
  username: string
  role: RolUsuario
  name: string
}

// ✅ Receta: La "fórmula" para Tragos y Combos
export interface ItemReceta {
  productId: string         
  cantidad: number          
}

// ✅ Categorías permitidas
export type CategoriaProducto = 
  | 'whisky' | 'vodka' | 'ron/licor' | 'tequila' | 'gin' 
  | 'cerveza' | 'vino' | 'champagne' | 'Gaseosa' 
  | 'Trago' | 'Combo' | 'otros'

// ✅ Botellas y Productos (El modelo principal)
export interface Botella {
  id: string
  nombre: string
  marca: string
  categoria: CategoriaProducto
  tipo: 'botella' | 'trago' | 'combo'
  
  precio: number
  precioCosto: number
  
  stockActual: number       
  stockMinimo: number       

  stockInicialJornada?: number 
  conteoFisicoReal?: number;
  

  // 🍹 Propiedades para TRAGOS / COMBOS
  receta?: ItemReceta[]     // Array de insumos vinculados
  isCombo?: boolean         // Flag visual

  createdAt: string
  updatedAt?: string
}

// ✅ Movimientos de Stock
export interface MovimientoStock {
  id: string
  botellaId: string         
  nombreBotella: string
  tipo: 'entrada' | 'venta' | 'ajuste'
  
  cantidad: number          
  monto: number             
  valorCortesia?: number   
  costo: number     
  
  autorizadoPor?: string | null;
  beneficiario?: string | null;    
  categoria?: string;
  usuarioId: string
  nombreUsuario: string
  notas?: string
  createdAt: string
  isClosed: boolean         
}

// ✅ Alertas inteligentes
export interface Alerta {
  id: string
  botellaId: string
  nombreBotella: string
  tipo: 'low_stock' | 'out_of_stock'
  leida: boolean
  createdAt: string
}

// ✅ Estadísticas de Dashboard
export interface EstadisticasDashboard {
  totalUnidades: number     // Calculado como stockMl / mlPorUnidad
  valorTotal: number        // (stock * costo)
  conteoStockBajo: number
  conteoSinStock: number
  revenueToday: number      
  costoCortesiasToday:number;
}


export interface JornadaAudit {
  id?: string;
  fecha: string;           
  fechaCorresponde: string;
  fechaCarga: string;
  totalVendidos: number;    // Unidades totales vendidas esa noche
  totalDiferencia: number;  // El desvío total (ej: -5.5 unidades)
  
  resumenCortesias: {
    responsable: string;
    cantidad: number;
    costoTotal: number;
  }[];

  
  productos: {
    nombre: string;
    inicial: number;
    vendido: number;
    cortesias:number;
    esperado: number;
    fisico: number;
    diferencia: number;
  }[];
}
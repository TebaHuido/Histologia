export interface ITejido {
    id: number;
    nombre: string;
    category: string;
    descripcion?: string;
    imagenUrl: string;
    alt: string;
}
export interface Categorias{
    id: number;
    name: string;
}
export interface Tag {
    id: number;
    name: string;
    public: boolean;
    alumno?: number;
    profesor?: number;
    ayudante?: number;
    created_at?: string;
}

export interface Label {
    id?: number;
    nota: string;
    tag?: number | Tag | null;  // Updated to include null
    tag_details?: Tag;
    coordenadas: { x: number; y: number };
    captura: number;
    created_by?: number;
    creator_name?: string;
    creator_display_name?: string;
    created_at?: string;
    public: boolean;
    is_owner?: boolean;
    visible?: boolean;
    highlighted?: boolean;
    isTemporary?: boolean;  // Add this line
}

export interface Nota {
    id?: number;
    titulo: string;
    cuerpo: string;
    alumno?: number;
    profesor?: number;
    muestra?: number;
    public: boolean;
}

export interface Muestra {
    id: number;
    name: string;
    capturas: {
        id: number;
        name: string;
        image: string;
        labels?: Label[];  // Agregar labels a las capturas
    }[];
    notas: Nota[];
    sistemas: string[];
}

export interface Sistema {
  sistema: string;    // Solo el nombre del sistema
  organo: string;     // El órgano asociado
  display?: string;   // Campo opcional para vista detallada
}

export interface Item {
  nombre: string;
}

export interface Captura {
  id: number;
  name: string;
  image: string;
}

export interface Tejido {
  id: number;
  name: string;
  capturas: Captura[];
  notas: any[];
  sistemas: Sistema[];
  public: boolean;
  imagenUrl?: string;
  Categoria?: any[];
  organo?: any[];
  tincion?: any[];
}

export interface Profesor {
  id: number;
  nombre: string;
  email?: string;
}

export interface Alumno {
  id: number;
  nombre: string;
  email?: string;
  curso?: number[];
}

export const tejidosArray: ITejido[] = [
    {
        id: 1,
        nombre: 'Tejido 1',
        category: 'pectoral',
        descripcion: 'Descripción del Tejido 1', // New property
        imagenUrl: 'https://concepto.de/wp-content/uploads/2019/04/histolog%C3%ADa-tejido-humano-e1554756738822.jpg',
        alt: 'Tejido 1'
    },
    {
        id: 2,
        nombre: 'Tejido 2',
        category: 'pectoral',
        descripcion: 'Descripción del Tejido 2', // New property
        imagenUrl: 'https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcT4A-NNkm3XUyTtIe3IVMfdwDoRdBQwABmSFw&s',
        alt: 'Tejido 2'
    },
    {
        id: 3,
        nombre: 'Tejido 3',
        category: 'facial',
        descripcion: 'Descripción del Tejido 3', // New property
        imagenUrl: 'https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcTt0U78bpB4eGgzhoQpmhniTlGPykhu_Tueiw&s',
        alt: 'Tejido 3'
    },
    {
        id: 4,
        nombre: 'Tejido 4',
        category: 'facial',
        descripcion: 'Descripción del Tejido 4', // New property
        imagenUrl: 'https://www.pathologylive.com/practicas-histologia/images/11.jpg',
        alt: 'Tejido 4'
    },
]
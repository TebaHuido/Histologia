import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ApiService } from '../services/api.service';
import { AuthService } from '../services/auth.service';

interface Lote {
  id: number;
  name: string;
  cursos: number[];
  muestras: number[];
  cursos_details?: {
    id: number;
    asignatura: string;
    anio: number;
    grupo: string;
  }[];
  muestras_details?: {
    id: number;
    name: string;
  }[];
}

interface Muestra {
  id: number;
  name: string;
  Categoria: Array<{ id: number; name: string; }>;
  organo: Array<{ id: number; name: string; }>;
  tincion: Array<{ id: number; name: string; }>;
  imagenUrl?: string;
}

@Component({
  selector: 'app-lotes',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './lotes.component.html',
  styleUrls: ['./lotes.component.css']
})
export class LotesComponent implements OnInit {
  lotes: Lote[] = [];
  newLote: Partial<Lote> = {};
  selectedLote: Lote | null = null;
  isEditing = false;
  isLoading = false;
  errorMessage = '';
  cursos: any[] = [];
  muestras: Muestra[] = [];
  selectedMuestras: number[] = [];
  selectedCursos: number[] = [];
  editSelectedMuestras: number[] = [];
  editSelectedCursos: number[] = [];
  categorias: any[] = [];
  organos: any[] = [];
  sistemas: any[] = [];
  tinciones: any[] = [];
  tags: any[] = [];
  
  filtrosMuestra = {
    categoria: '',
    organo: '',
    sistema: '',
    tincion: '',
    tag: '',
    searchText: ''
  };

  muestrasFiltradas: Muestra[] = [];
  muestrasFiltradas_edit: Muestra[] = []; // New array for edit mode

  constructor(private api: ApiService, public auth: AuthService) {}

  ngOnInit(): void {
    this.loadLotes();
    this.loadCursos();
    this.loadMuestras();
    this.loadFilters();
  }

  loadLotes(): void {
    this.isLoading = true;
    // TODO: Implementar getLotes en ApiService
    this.api.getLotes().subscribe({
      next: (data) => {
        this.lotes = data;
        this.isLoading = false;
      },
      error: (error) => {
        this.errorMessage = 'Error al cargar los lotes';
        this.isLoading = false;
        console.error('Error:', error);
      }
    });
  }

  loadCursos(): void {
    this.api.getCursos().subscribe({
      next: (data) => this.cursos = data,
      error: (error) => console.error('Error al cargar cursos:', error)
    });
  }

  loadMuestras(): void {
    this.api.getMuestras().subscribe({
      next: (data: any[]) => {
        this.muestras = data.map((m: any) => ({
          id: m.id,
          name: m.name,
          Categoria: m.Categoria || [],
          organo: m.organo || [],
          tincion: m.tincion || [],
          imagenUrl: m.imagenUrl
        }));
        this.muestrasFiltradas = [...this.muestras];
      },
      error: (error) => console.error('Error al cargar muestras:', error)
    });
  }

  loadFilters(): void {
    this.api.getFilters().subscribe({
      next: (data) => {
        this.categorias = data.categorias;
        this.organos = data.organos;
        this.sistemas = data.sistemas;
        this.tinciones = data.tinciones;
        this.tags = data.tags;
      },
      error: (error) => console.error('Error cargando filtros:', error)
    });
  }

  aplicarFiltros(): void {
    this.muestrasFiltradas = this.muestras.filter(muestra => {
      const matchesCategoria = !this.filtrosMuestra.categoria ||
        muestra.Categoria.some((cat: any) => cat.id === this.filtrosMuestra.categoria);
      const matchesOrgano = !this.filtrosMuestra.organo ||
        muestra.organo.some((org: any) => org.id === this.filtrosMuestra.organo);
      const matchesSistema = !this.filtrosMuestra.sistema ||
        muestra.organo.some((org: any) => org.sistema.some((sis: any) => sis.id === this.filtrosMuestra.sistema));
      const matchesTincion = !this.filtrosMuestra.tincion ||
        muestra.tincion.some((tin: any) => tin.id === this.filtrosMuestra.tincion);
      const matchesSearch = !this.filtrosMuestra.searchText ||
        muestra.name.toLowerCase().includes(this.filtrosMuestra.searchText.toLowerCase());

      return matchesCategoria && matchesOrgano && matchesSistema && matchesTincion && matchesSearch;
    });
  }

  resetFiltros(): void {
    this.filtrosMuestra = {
      categoria: '',
      organo: '',
      sistema: '',
      tincion: '',
      tag: '',
      searchText: ''
    };
    this.muestrasFiltradas = [...this.muestras];
  }

  saveLote(): void {
    if (!this.newLote.name) {
      this.errorMessage = 'Por favor ingrese un nombre para el lote';
      return;
    }

    this.isLoading = true;
    const loteData = {
      name: this.newLote.name,
      cursos: this.selectedCursos || [],
      muestras: this.selectedMuestras || []
    };

    this.api.createLote(loteData).subscribe({
      next: (response) => {
        this.lotes.push(response);
        this.newLote = {};
        this.selectedCursos = [];
        this.selectedMuestras = [];
        this.isLoading = false;
        this.errorMessage = '';
      },
      error: (error) => {
        this.errorMessage = 'Error al crear el lote';
        this.isLoading = false;
        console.error('Error:', error);
      }
    });
  }

  deleteLote(id: number): void {
    if (!confirm('¿Está seguro de eliminar este lote?')) return;

    // TODO: Implementar deleteLote en ApiService
    this.api.deleteLote(id).subscribe({
      next: () => {
        this.lotes = this.lotes.filter(lote => lote.id !== id);
      },
      error: (error) => {
        this.errorMessage = 'Error al eliminar el lote';
        console.error('Error:', error);
      }
    });
  }

  editLote(lote: Lote): void {
    this.selectedLote = { ...lote };
    this.isEditing = true;
    this.editSelectedMuestras = lote.muestras || [];
    this.editSelectedCursos = lote.cursos || [];
    this.muestrasFiltradas_edit = [...this.muestras]; // Initialize edit filtered list
  }

  updateLote(): void {
    if (!this.selectedLote) return;

    if (!this.selectedLote.name) {
      this.errorMessage = 'Por favor ingrese un nombre para el lote';
      return;
    }

    this.isLoading = true;
    const loteData = {
      name: this.selectedLote.name,
      cursos: this.editSelectedCursos || [],
      muestras: this.editSelectedMuestras || []
    };

    this.api.updateLote(this.selectedLote.id, loteData).subscribe({
      next: (response) => {
        const index = this.lotes.findIndex(l => l.id === this.selectedLote!.id);
        if (index !== -1) {
          this.lotes[index] = response;
        }
        this.cancelEdit();
        this.isLoading = false;
      },
      error: (error) => {
        this.errorMessage = 'Error al actualizar el lote';
        this.isLoading = false;
        console.error('Error:', error);
      }
    });
  }

  cancelEdit(): void {
    this.selectedLote = null;
    this.isEditing = false;
    this.editSelectedMuestras = [];
    this.editSelectedCursos = [];
    this.muestrasFiltradas_edit = []; // Clear edit filtered list
  }

  toggleMuestra(muestraId: number): void {
    if (this.isEditing) {
      const index = this.editSelectedMuestras.indexOf(muestraId);
      if (index === -1) {
        this.editSelectedMuestras.push(muestraId);
      } else {
        this.editSelectedMuestras.splice(index, 1);
      }
    } else {
      const index = this.selectedMuestras.indexOf(muestraId);
      if (index === -1) {
        this.selectedMuestras.push(muestraId);
      } else {
        this.selectedMuestras.splice(index, 1);
      }
    }
  }

  toggleCurso(cursoId: number): void {
    if (this.isEditing) {
      const index = this.editSelectedCursos.indexOf(cursoId);
      if (index === -1) {
        this.editSelectedCursos.push(cursoId);
      } else {
        this.editSelectedCursos.splice(index, 1);
      }
    } else {
      const index = this.selectedCursos.indexOf(cursoId);
      if (index === -1) {
        this.selectedCursos.push(cursoId);
      } else {
        this.selectedCursos.splice(index, 1);
      }
    }
  }

  getCursoName(cursoId: number): string {
    const curso = this.cursos.find(c => c.id === cursoId);
    return curso ? `${curso.asignatura} - ${curso.anio} (${curso.grupo})` : 'N/A';
  }

  getMuestraName(muestraId: number): string {
    const muestra = this.muestras.find(m => m.id === muestraId);
    return muestra ? muestra.name : 'N/A';
  }
}

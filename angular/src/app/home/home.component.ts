import { Component, OnInit } from '@angular/core';
import { ApiService } from '../services/api.service';
import { Tejido, Categorias } from '../services/tejidos.mock';
import { NgFor, CommonModule } from '@angular/common';
import { FilterComponent } from '../filter/filter.component';
import { AuthService } from '../services/auth.service';
import { Router } from '@angular/router';  // Agregar esta importación

interface Item {
  nombre: string;
}

@Component({
  selector: 'app-home',
  standalone: true,
  imports: [NgFor, CommonModule, FilterComponent],
  templateUrl: './home.component.html',
  styleUrls: ['./home.component.css']
})
export class HomeComponent implements OnInit {
  listaTejidos_all: Tejido[] = [];
  listaTejidos_show: Tejido[] = [];
  listaCategorias: Categorias[] = [];
  sistemasUnicos: string[] = [];
  filteredTagsItems: { nombre: string }[] = [];
  filteredTejidosItems: { nombre: string }[] = [];
  sistemasUnicosFormateados: { nombre: string }[] = [];

  categorias: Item[] = [];
  organos: Item[] = [];
  sistemas: Item[] = [];
  tinciones: Item[] = [];
  tags: Item[] = [];

  selectedFilters: { [key: string]: string[] } = {
    category: [],
    organ: [],
    system: [],
    tincion: [],
    tag: []
  };

  constructor(
    private api: ApiService, 
    public authService: AuthService,  // Change from private to public
    private router: Router  // Agregar Router al constructor
  ) {}

  ngOnInit(): void {
    // Verificar autenticación antes de hacer las llamadas
    if (!this.authService.isLoggedIn()) {
      this.router.navigate(['/login']);
      return;
    }
    this.loadFilters();
    this.loadTejidos(); // Removemos el parámetro 'all' ya que no se usa
  }

  loadFilters(): void {
    this.api.getFilters().subscribe({
      next: (data) => {
        this.categorias = this.transformDataToItems(data.categorias);
        this.organos = this.transformDataToItems(data.organos);
        this.sistemas = this.transformDataToItems(data.sistemas);
        this.tinciones = this.transformDataToItems(data.tinciones);
        this.tags = this.transformDataToItems(data.tags);
      },
      error: (error) => {
        console.error('Error al obtener filtros:', error);
        if (error.status === 403) {
          this.authService.logout(); // Redirigir al login si no está autenticado
        }
      }
    });
  }

  loadTejidos(): void {
    this.api.getTejidos('').subscribe({
      next: (data) => {
        // Add null check and filter out null values
        const validData = data?.filter(item => item !== null) || [];
        if (validData.length === 0) {
          this.handleNoMuestras();
        } else {
          this.listaTejidos_all = validData;
          this.listaTejidos_show = validData;
          this.filteredTejidosItems = validData
            .filter(te => te && te.name)  // Add null check
            .map(te => ({ nombre: te.name }));
          this.obtenerSistemasUnicos();
        }
      },
      error: (error) => {
        console.error('Error al obtener los tejidos:', error);
        if (error.status === 403) {
          this.authService.logout();
        } else {
          this.handleNoMuestras();
        }
      }
    });
  }

  private handleNoMuestras(): void {
    this.listaTejidos_all = [];
    this.listaTejidos_show = [];
    this.filteredTejidosItems = [];
    this.sistemasUnicos = [];
    if (this.authService.isAlumno()) {
      alert('No tienes acceso a ninguna muestra. Contacta a tu profesor para que te asigne a un curso con muestras.');
    } else {
      alert('No hay muestras disponibles en el sistema.');
    }
  }

  private transformDataToItems(data: any[]): Item[] {
    if (!data) return [];
    return data.map((item: any) => ({ nombre: item.name || item }));
  }

  filterMuestras(): void {
    this.api.filterMuestras(this.selectedFilters,).subscribe({
      next: (tejidos: Tejido[]) => {
        this.listaTejidos_show = tejidos;
        this.obtenerSistemasUnicos();
      },
      error: err => {
        console.error('Error al filtrar muestras:', err);
      }
    });
  }

  updateSelectedFilters(type: string, items: string[]): void {
    this.selectedFilters[type] = items;
    this.filterMuestras();
  }

  obtenerSistemasUnicos() {
    const sistemasSet = new Set<string>();
    this.listaTejidos_show
      .filter(tejido => tejido !== null)  // Add null check
      .forEach(tejido => {
        if (Array.isArray(tejido.sistemas) && tejido.sistemas.length > 0) {
          tejido.sistemas
            .filter(sistema => sistema)  // Filter out null/undefined values
            .forEach(sistema => sistemasSet.add(sistema));
        }
      });
    this.sistemasUnicos = Array.from(sistemasSet);
    this.sistemasUnicosFormateados = this.sistemasUnicos
      .filter(sistema => sistema)  // Filter out null values
      .map(sistema => ({ nombre: sistema }));
  }

  selectCategory(category: string) {
    console.log('Categoría seleccionada:', category);
    if (category === 'all') {
      this.listaTejidos_show = this.listaTejidos_all;
    } else {
      this.api.getTejidos(category).subscribe({
        next: (tejidos: Tejido[]) => {
          this.listaTejidos_show = tejidos;
          this.obtenerSistemasUnicos();
        },
        error: err => {
          console.error('Error al obtener tejidos por categoría:', err);
        }
      });
    }
    this.obtenerSistemasUnicos();
  }

  drawPoint(event: MouseEvent) {
    console.log(event.offsetX, event.offsetY);
  }

  getMuestrasPorSistema(sistema: string): Tejido[] {
    return this.listaTejidos_show
      .filter(muestra => muestra !== null)  // Add null check
      .filter(muestra => 
        Array.isArray(muestra.sistemas) && 
        muestra.sistemas.includes(sistema)
      );
  }

  getMuestrasSinSistema(): Tejido[] {
    return this.listaTejidos_show
      .filter(muestra => muestra !== null)  // Add null check
      .filter(muestra => 
        !Array.isArray(muestra.sistemas) || 
        muestra.sistemas.length === 0 ||
        muestra.sistemas.every(sistema => !sistema)
      );
  }

  updateNota(id: number, nota: any): void {
    this.api.updateNota(id, nota).subscribe({
      next: (response: any) => {
        console.log('Nota actualizada exitosamente', response);
      },
      error: err => {
        console.error('Error al actualizar la nota:', err);
      }
    });
  }
}

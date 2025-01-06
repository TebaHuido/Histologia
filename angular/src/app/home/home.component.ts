import { Component, OnInit } from '@angular/core';
import { ApiService } from '../services/api.service';
import { Tejido, Categorias, Sistema, Item } from '../services/tejidos.mock';
import { NgFor, CommonModule } from '@angular/common';
import { FilterComponent } from '../filter/filter.component';
import { AuthService } from '../services/auth.service';
import { Router } from '@angular/router';  // Agregar esta importación
import { RouterModule } from '@angular/router';  // Add this import

@Component({
  selector: 'app-home',
  standalone: true,
  imports: [NgFor, CommonModule, FilterComponent, RouterModule],  // Add RouterModule
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

  selectedFilters: { [key: string]: string[] } = {
    category: [],
    organ: [],
    system: [],
    tincion: []
    // Removed "tag" field
  };

  muestrasFiltradas: Tejido[] = [];
  muestras: Tejido[] = [];

  private baseListaTejidos: Tejido[] = []; // Add this line to store the initial authorized list

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

  handleImageError(event: Event): void {
    const target = event.target as HTMLImageElement;
    if (!target.src.endsWith('/assets/images/no-image.png')) {
      target.src = '/assets/images/no-image.png';
    }
  }

  loadFilters(): void {
    this.api.getFilters().subscribe({
      next: (data) => {
        this.categorias = this.transformDataToItems(data.categorias);
        this.organos = this.transformDataToItems(data.organos);
        this.sistemas = this.transformDataToItems(data.sistemas);
        this.tinciones = this.transformDataToItems(data.tinciones);
        // Removed line: this.tags = this.transformDataToItems(data.tags);
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
        const validData = data?.filter(item => item !== null) || [];
        console.log('Received tejidos data:', validData);

        if (validData.length === 0) {
          if (this.authService.isAlumno()) {
            this.errorMessage = 'No tienes acceso a ninguna muestra. Contacta a tu profesor para que te asigne a un curso con muestras.';
          } else {
            this.errorMessage = 'No hay muestras disponibles en el sistema.';
          }
          this.handleNoMuestras();
        } else {
          // Store the initial authorized list
          this.baseListaTejidos = validData;
          this.listaTejidos_all = validData;
          this.listaTejidos_show = validData;
          this.filteredTejidosItems = validData
            .filter(te => te && te.name)
            .map(te => ({ nombre: te.name }));
          this.obtenerSistemasUnicos();
        }
      },
      error: (error) => {
        console.error('Error al obtener los tejidos:', error);
        if (error.status === 403) {
          this.authService.logout();
        } else {
          this.errorMessage = 'Error al cargar las muestras. Por favor, inténtalo de nuevo.';
          this.handleNoMuestras();
        }
      }
    });
  }

  // Add error message property
  errorMessage: string = '';

  private handleNoMuestras(): void {
    this.listaTejidos_all = [];
    this.listaTejidos_show = [];
    this.filteredTejidosItems = [];
    this.sistemasUnicos = [];
  }

  private transformDataToItems(data: any[]): Item[] {
    if (!data) return [];
    return data.map((item: any) => ({ nombre: item.name || item }));
  }

  filterMuestras(): void {
    // If no filters are active, restore to base list
    if (Object.values(this.selectedFilters).every(arr => arr.length === 0)) {
      this.listaTejidos_show = [...this.baseListaTejidos];
      this.obtenerSistemasUnicos();
      return;
    }

    this.api.filterMuestras(this.selectedFilters).subscribe({
      next: (tejidos: Tejido[]) => {
        // Filter received tejidos against base authorized list
        this.listaTejidos_show = tejidos.filter(tejido => 
          this.baseListaTejidos.some(baseTejido => baseTejido.id === tejido.id)
        );
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
    // Recreate 'sistemas' if missing
    this.listaTejidos_show.forEach(tejido => {
      if (!tejido.sistemas && Array.isArray(tejido.organo)) {
        tejido.sistemas = [];
        tejido.organo.forEach(org => {
          if (org.sistema) {
            org.sistema.forEach((sis: any) => {
              tejido.sistemas.push({ sistema: sis.name, organo: org.name });
            });
          }
        });
      }
    });
    const sistemasSet = new Set<string>();  // Changed to just string
    this.listaTejidos_show
      .filter(tejido => tejido !== null)
      .forEach(tejido => {
        if (Array.isArray(tejido.sistemas) && tejido.sistemas.length > 0) {
          tejido.sistemas
            .filter(sistema => sistema && sistema.sistema)  // Check for sistema property
            .forEach(sistema => sistemasSet.add(sistema.sistema));  // Just add sistema name
        }
      });
    
    this.sistemasUnicos = Array.from(sistemasSet);
    this.sistemasUnicosFormateados = this.sistemasUnicos
      .filter(sistema => sistema)
      .map(sistema => ({ nombre: sistema }));
  }

  private updateSistemasList(muestras: Tejido[]): void {
    const sistemasSet = new Set<Item>();
    muestras
      .filter(muestra => muestra.sistemas)
      .forEach(muestra => 
        muestra.sistemas.forEach(sistema => 
          sistemasSet.add({ nombre: `${sistema.sistema} - ${sistema.organo}` })
        )
      );
    this.sistemas = Array.from(sistemasSet);
  }

  filterBySistema(sistema: Sistema): void {
    this.muestrasFiltradas = this.listaTejidos_show.filter(muestra => 
      muestra.sistemas.some(s => 
        s.sistema === sistema.sistema && 
        s.organo === sistema.organo
      )
    );
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

  getMuestrasPorSistema(sistemaNombre: string): Tejido[] {
    return this.listaTejidos_show
      .filter(muestra => muestra !== null)
      .filter(muestra => 
        Array.isArray(muestra.sistemas) && 
        muestra.sistemas.some(s => s.sistema === sistemaNombre)
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

  getImageUrl(muestra: Tejido): string {
    const baseUrl = 'http://localhost:80';
    if (muestra.imagenUrl) {
      return `${baseUrl}${muestra.imagenUrl}`;
    }
    // Use the first capture if available
    if (muestra.capturas && muestra.capturas.length > 0) {
      return `${baseUrl}${muestra.capturas[0].image}`;
    }
    return '/assets/images/no-image.png';
  }
}

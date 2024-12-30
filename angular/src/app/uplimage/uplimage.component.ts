import { Component, OnInit } from '@angular/core';
import { ReactiveFormsModule, FormBuilder, FormGroup, FormArray, Validators } from '@angular/forms';
import { HttpClient } from '@angular/common/http';
import { CommonModule } from '@angular/common';
import { AuthService } from '../services/auth.service';

@Component({
  standalone: true,
  selector: 'app-uplimage',
  templateUrl: './uplimage.component.html',
  styleUrls: ['./uplimage.component.css'],
  imports: [ReactiveFormsModule, CommonModule]
})
export class UplimageComponent implements OnInit {
  sampleForm: FormGroup;
  categories: any[] = [];
  organos: any[] = [];
  sistemas: any[] = [];
  tinciones: any[] = [];
  isCreatingNewCategory = false;
  isCreatingNewOrgano = false;
  isCreatingNewSistema = false;
  isCreatingNewTincion = false;
  selectedFiles: File[] = [];

  constructor(private fb: FormBuilder, private http: HttpClient, private authService: AuthService) {
    this.sampleForm = this.fb.group({
      name: ['', Validators.required],
      category: ['', Validators.required],
      newCategory: [''],
      organo: ['', Validators.required],
      newOrgano: [''],
      sistema: [''],
      newSistema: [''],
      tincion: ['', Validators.required],
      newTincion: [''],
      images: this.fb.array([], Validators.required) // Validación para asegurar que se suban imágenes
    });
  }

  ngOnInit() {
    this.loadCategories();
    this.loadOrganos();
    this.loadSistemas();
    this.loadTinciones();
  }

  loadTinciones() {
    this.http.get('http://localhost:8000/api/tinciones/').subscribe((data: any) => {
      this.tinciones = data;
    });
  }
  
  loadCategories() {
    const headers = this.authService.getAuthHeaders();
    this.http.get('http://localhost:8000/api/categorias/', { headers, withCredentials: true }).subscribe((data: any) => {
      this.categories = data;
    });
  }

  loadOrganos() {
    const headers = this.authService.getAuthHeaders();
    this.http.get('http://localhost:8000/api/organos/', { headers, withCredentials: true }).subscribe((data: any) => {
      this.organos = data;
    });
  }

  loadSistemas() {
    const headers = this.authService.getAuthHeaders();
    this.http.get('http://localhost:8000/api/sistemas/', { headers, withCredentials: true }).subscribe((data: any) => {
      this.sistemas = data;
    });
  }

  onTincionChange(event: any) {
    const value = event.target.value;
    this.isCreatingNewTincion = value === 'new';
  }

  onCategoryChange(event: any) {
    const value = event.target.value;
    this.isCreatingNewCategory = value === 'new';
  }

  onOrganoChange(event: any) {
    const value = event.target.value;
    this.isCreatingNewOrgano = value === 'new';

    if (!this.isCreatingNewOrgano) {
      const selectedOrgano = this.organos.find(organo => organo.id === value);
      if (selectedOrgano && selectedOrgano.sistema) {
        this.sampleForm.patchValue({ sistema: selectedOrgano.sistema.id });
      } else {
        this.sampleForm.patchValue({ sistema: null });
      }
    }
  }

  onSistemaChange(event: any) {
    const value = event.target.value;
    this.isCreatingNewSistema = value === 'new';
  }

  onFileChange(event: any) {
    const files = event.target.files;
    if (files.length > 0) {
      this.selectedFiles = Array.from(files);
      this.imageFormArray.clear();
      this.selectedFiles.forEach(() => this.imageFormArray.push(this.fb.control('')));
    }
  }

  get imageFormArray(): FormArray {
    return this.sampleForm.get('images') as FormArray;
  }

  onSubmit() {
    if (this.sampleForm.invalid) {
      console.error('Formulario inválido:', this.sampleForm.errors);
      return;
    }
  
    const formData = new FormData();
    formData.append('name', this.sampleForm.get('name')?.value);
  
    // Categorías
    const selectedCategory = this.sampleForm.get('category')?.value;
    const newCategory = this.sampleForm.get('newCategory')?.value;
    if (this.isCreatingNewCategory && newCategory) {
      formData.append('categoria', newCategory);
    } else if (selectedCategory) {
      formData.append('categoria', selectedCategory);
    }
  
    // Órganos
    const selectedOrgano = this.sampleForm.get('organo')?.value;
    const newOrgano = this.sampleForm.get('newOrgano')?.value;
    if (this.isCreatingNewOrgano && newOrgano) {
      formData.append('organo', newOrgano);
    } else if (selectedOrgano) {
      formData.append('organo', selectedOrgano);
    }
  
    // Sistemas
    const selectedSistema = this.sampleForm.get('sistema')?.value;
    const newSistema = this.sampleForm.get('newSistema')?.value;
    if (this.isCreatingNewSistema && newSistema) {
      formData.append('sistema', newSistema);
    } else if (selectedSistema) {
      formData.append('sistema', selectedSistema);
    }
  
    // Tinciones
    const selectedTincion = this.sampleForm.get('tincion')?.value;
    const newTincion = this.sampleForm.get('newTincion')?.value;
    if (this.isCreatingNewTincion && newTincion) {
      formData.append('tincion', newTincion);
    } else if (selectedTincion) {
      formData.append('tincion', selectedTincion);
    }
    // Imágenes
    this.selectedFiles.forEach((file, index) => {
      formData.append('images', file);
      formData.append('image_names', this.imageFormArray.at(index).value || '');
    });
  
    // Enviar solicitud al servidor
    const headers = this.authService.getAuthHeaders();
    this.http.post('http://localhost:8000/api/muestras/', formData, { headers, withCredentials: true }).subscribe({
      next: (response) => {
        console.log('Muestra creada exitosamente:', response);
        this.resetForm();
      },
      error: (err) => {
        console.error('Error al crear la muestra:', err);
      }
    });
  }
  
  resetForm() {
    this.sampleForm.reset();
    this.selectedFiles = [];
    this.imageFormArray.clear();
    this.isCreatingNewCategory = false;
    this.isCreatingNewOrgano = false;
    this.isCreatingNewSistema = false;
  }
}

import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { AuthService } from '../services/auth.service';
import { ApiService } from '../services/api.service';

interface SampleNote {
  id: number;
  name: string;
  notes: string;
  coordinates: string;
  previewUrl: string;
}

@Component({
  selector: 'app-notes',
  standalone: true,
  imports: [RouterModule, CommonModule, FormsModule],
  templateUrl: './notes.component.html',
  styleUrls: ['./notes.component.css']
})
export class NotesComponent {
  sampleNotes: SampleNote[] = [
    {
      id: 1,
      name: 'Muestra A',
      notes: 'Nota de ejemplo para la muestra A',
      coordinates: 'x: 100, y: 200',
      previewUrl: 'https://via.placeholder.com/150'
    },
    {
      id: 2,
      name: 'Muestra B',
      notes: 'Nota de ejemplo para la muestra B',
      coordinates: 'x: 150, y: 250',
      previewUrl: 'https://via.placeholder.com/150'
    },
    {
      id: 3,
      name: 'Muestra C',
      notes: 'Nota de ejemplo para la muestra C',
      coordinates: 'x: 200, y: 300',
      previewUrl: 'https://via.placeholder.com/150'
    }
  ];

  constructor(private authService: AuthService, private apiService: ApiService) {}

  onSave(sample: SampleNote): void {
    console.log(`Guardando cambios para ${sample.name}`);
    console.log('Notas:', sample.notes);
    console.log('Coordenadas:', sample.coordinates);
    this.apiService.updateSample(sample.id, sample).subscribe({
      next: (response: any) => {
        console.log('Cambios guardados exitosamente:', response);
      },
      error: (err: any) => {
        console.error('Error al guardar los cambios:', err);
      }
    });
  }
}
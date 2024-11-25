import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { FormsModule } from '@angular/forms';
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
  imports: [RouterModule,CommonModule,FormsModule],
  templateUrl: './notes.component.html',
  styleUrls: ['./notes.component.css']
})
export class NotesComponent {
  // Array de notas de ejemplo
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

  // Método simulado para guardar cambios (puede adaptarse para guardar cada muestra de forma individual)
  onSave(sample: SampleNote): void {
    console.log(`Guardando cambios para ${sample.name}`);
    console.log('Notas:', sample.notes);
    console.log('Coordenadas:', sample.coordinates);
  }
}
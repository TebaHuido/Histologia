import { Routes } from '@angular/router';
import { HomeComponent } from './home/home.component';
import { SettingsComponent } from './settings/settings.component';
import { NotesComponent } from './notes/notes.component';
import { TejidoComponent } from './tejido/tejido.component';
import { UplimageComponent } from './uplimage/uplimage.component';
import { LoginComponent } from './login/login.component';
import { TissueviewerComponent } from './tissueviewer/tissueviewer.component';
import { ImageProcessorComponent } from './image-processor/image-processor.component';
import { TestingviewComponent } from './testingview/testingview.component';
import { FilterComponent } from './filter/filter.component';
import { UploadXlsComponent } from './upload-xls/upload-xls.component';
import { AuthGuard } from './services/auth.guard'; // Asegúrate de importar el AuthGuard
import { LotesComponent } from './lotes/lotes.component';  // Añadir esta importación

export const routes: Routes = [
    { path: '', component: HomeComponent, title: 'Muestras Histológicas UTA', canActivate: [AuthGuard] },
    { path: 'settings', component: SettingsComponent, canActivate: [AuthGuard] },
    { path: 'notes', component: NotesComponent, canActivate: [AuthGuard] },
    { path: 'uploadimg', component: UplimageComponent, canActivate: [AuthGuard] },
    { path: 'tejido', component: TejidoComponent, canActivate: [AuthGuard] },
    { path: 'tejido/:id', component: TejidoComponent, canActivate: [AuthGuard] },
    { path: 'sesion', component: LoginComponent },
    { path: 'tissueviewer', component: TissueviewerComponent, canActivate: [AuthGuard] },
    { path: 'playground', component: ImageProcessorComponent, canActivate: [AuthGuard] },
    { path: 'test', component: FilterComponent, canActivate: [AuthGuard] },
    { path: 'login', component: LoginComponent },
    { path: 'testing', component: TestingviewComponent, canActivate: [AuthGuard] },
    { path: 'upload-xls', component: UploadXlsComponent, canActivate: [AuthGuard] },
    { path: 'lotes', component: LotesComponent, canActivate: [AuthGuard] }
];

import { Component } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { RouterModule } from '@angular/router';

@Component({
  selector: 'app-edit',
  imports: [MatFormFieldModule, MatInputModule, MatButtonModule, MatCardModule ,RouterModule],
  templateUrl: './edit.html',
  styleUrl: './edit.scss'
})
export class Edit {

}

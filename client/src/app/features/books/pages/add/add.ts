import { Component } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';

@Component({
  selector: 'app-add',
    imports: [MatInputModule, MatFormFieldModule, MatButtonModule],
  templateUrl: './add.html',
  styleUrl: './add.scss'
})
export class Add {

}

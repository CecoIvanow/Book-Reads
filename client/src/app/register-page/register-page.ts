import { Component } from '@angular/core';
import { MatInputModule } from '@angular/material/input';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatButtonModule } from '@angular/material/button';
import { MatRadioModule } from '@angular/material/radio';

type Gender = 'Male' | 'Female';

@Component({
  selector: 'register-page',
  imports: [MatInputModule, MatFormFieldModule, MatRadioModule, MatButtonModule],
  templateUrl: './register-page.html',
  styleUrl: './register-page.scss'
})

export class RegisterPage {
  genders: Gender[] = [
    'Male',
    'Female'
  ];
}

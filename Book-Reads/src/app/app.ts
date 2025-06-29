import { Component } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { LoginPage } from './login-page/login-page.js';
import { RegisterPage } from './register-page/register-page.js';

@Component({
  selector: 'app-root',
  imports: [RouterOutlet, LoginPage, RegisterPage],
  templateUrl: './app.html',
  styleUrl: './app.scss'
})
export class App {
  protected title = 'Book-Reads';
}

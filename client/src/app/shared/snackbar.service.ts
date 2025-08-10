import { Injectable } from '@angular/core';
import { MatSnackBar } from '@angular/material/snack-bar';

@Injectable({
  providedIn: 'root'
})
export class SnackbarService {

  constructor(private snackbar: MatSnackBar) {
  }

  showSnackBar(message: string): void {
    this.snackbar.open(message);

    setTimeout(() => {
        this.snackbar.dismiss();
    }, 5000)
  }
}

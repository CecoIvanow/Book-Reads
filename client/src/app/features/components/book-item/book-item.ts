import { CommonModule } from '@angular/common';
import { Component, EventEmitter, Input, Output } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { RouterModule } from '@angular/router';
import { Book } from '../../books/models/index.js';
import { UserSessionService } from '../../../core/auth/services/index.js';
import { UUIDv4 } from '../../../shared/models/index.js';

@Component({
  selector: 'app-book-item',
  imports: [
    MatCardModule,
    MatButtonModule,
    MatInputModule,
    MatFormFieldModule,
    MatProgressSpinnerModule,
    RouterModule,
    CommonModule
  ],
  templateUrl: './book-item.html',
  styleUrl: './book-item.scss'
})
export class BookItem {
    @Input() book!: Book;

    @Output() delete = new EventEmitter<UUIDv4>()

    constructor(protected userSession: UserSessionService) {
    }

    onDeleteClick() {
        this.delete.emit(this.book._id)
    }
}

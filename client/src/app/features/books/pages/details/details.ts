import { Component } from '@angular/core';
import { Book } from '../../book.model.js';
import { BooksService } from '../../books.service.js';

@Component({
  selector: 'app-details',
  imports: [],
  templateUrl: './details.html',
  styleUrl: './details.scss'
})
export class Details {
    protected bookDetails!: Book;

    constructor(private bookService: BooksService) {
    }
}

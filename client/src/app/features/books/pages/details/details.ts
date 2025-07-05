import { Component, OnInit } from '@angular/core';
import { Book } from '../../book.model.js';
import { BooksService } from '../../books.service.js';

@Component({
  selector: 'app-details',
  imports: [],
  templateUrl: './details.html',
  styleUrl: './details.scss'
})
export class Details implements OnInit {
    protected bookDetails!: Book;

    constructor(private bookService: BooksService) {
    }

    ngOnInit(): void {
        this.bookService.getBook('c7d3e8f9-1a2b-3c4d-5e6f-7a8b9c0d1e2f').subscribe(data => this.bookDetails = data);
        console.log(this.bookDetails);
    }
}

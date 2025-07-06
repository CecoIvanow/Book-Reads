import { Component, OnInit } from '@angular/core';
import { Book } from '../../book.model.js';
import { BooksService } from '../../books.service.js';
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { Comment } from './models/index.js';

@Component({
    selector: 'app-details',
    imports: [MatCardModule, MatButtonModule],
    templateUrl: './details.html',
    styleUrl: './details.scss'
})
export class Details implements OnInit {
    protected book: Book | null = null;
    protected comments: Comment[] | null = null;

    constructor(private bookService: BooksService) {
    }

    ngOnInit(): void {
        this.bookService.getBookWithOwner('c7d3e8f9-1a2b-3c4d-5e6f-7a8b9c0d1e2f').subscribe(data => {
            this.book = data
        });

        this.bookService.getBookCommentsOwnerId('c7d3e8f9-1a2b-3c4d-5e6f-7a8b9c0d1e2f').subscribe(data => {
            this.comments = data
            console.log(this.comments);
        });
    }
}

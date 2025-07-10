import { Component, OnInit } from '@angular/core';
import { Book } from '../../models/index.js';
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { CommentType } from '../../models/index.js';
import { BooksService } from '../../books.service.js';

@Component({
    selector: 'app-details',
    imports: [MatCardModule, MatButtonModule],
    templateUrl: './details.html',
    styleUrl: './details.scss'
})
export class Details implements OnInit {
    protected book: Book | null = null;
    protected comments: CommentType[] = [];

    constructor(private bookService: BooksService) {
    }

    ngOnInit(): void {
        this.bookService.getBookWithOwner('c7d3e8f9-1a2b-3c4d-5e6f-7a8b9c0d1e2f').subscribe(data => {
            this.book = data
        });

        this.bookService.getBookCommentsId('c7d3e8f9-1a2b-3c4d-5e6f-7a8b9c0d1e2f').subscribe(data => {
            data.forEach((value) => {
                this.bookService.getCommentWithOwner(value._id).subscribe(data => this.comments?.push(data));
            });
        });
    }
}

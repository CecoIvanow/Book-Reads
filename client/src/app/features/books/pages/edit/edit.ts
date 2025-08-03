import { Component, OnDestroy, OnInit, signal } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { ActivatedRoute, RouterModule } from '@angular/router';
import { Book } from '../../models/book.model.js';
import { Subscription } from 'rxjs';

@Component({
  selector: 'app-edit',
  imports: [MatFormFieldModule, MatInputModule, MatButtonModule, MatCardModule ,RouterModule],
  templateUrl: './edit.html',
  styleUrl: './edit.scss'
})
export class Edit implements OnInit, OnDestroy {
    protected book = signal<Book | null>(null);

    private subscriptions = new Subscription();

    constructor(private route: ActivatedRoute){
    }

    ngOnInit(): void {
        const bookData: Book = this.route.snapshot.data['bookDetails'].at(0);

        this.book.set(bookData);        
    }

    ngOnDestroy(): void {
 

        this.subscriptions.unsubscribe();
    }
}

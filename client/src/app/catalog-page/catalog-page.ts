import { Component } from '@angular/core';

type UUIDv4 = string;

type Book = {
    _ownerId: UUIDv4,
    title: string,
    author: string,
    img: string,
    createdOn: string,
    _id: UUIDv4,
    likes: UUIDv4[],
    comments: UUIDv4[],
    summary: string
}

@Component({
    selector: 'catalog-page',
    imports: [],
    templateUrl: './catalog-page.html',
    styleUrl: './catalog-page.scss'
})
export class CatalogPage {
    books: Book[] = [];

    async ngOnInit() {
        const resp = await fetch('http://localhost:3030/data/books?offset=0&pageSize=5');

        this.books = await resp.json();
    }
}

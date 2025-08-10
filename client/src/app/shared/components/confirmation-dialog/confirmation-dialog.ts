import { Component, Inject } from '@angular/core';
import { MAT_DIALOG_DATA, MatDialogModule } from '@angular/material/dialog';
import { CommonModule } from '@angular/common';
import { MatButtonModule } from '@angular/material/button';

@Component({
    selector: 'app-confirmation-dialog',
    standalone: true,
    imports: [
        MatDialogModule,
        CommonModule,
        MatButtonModule,
    ],
    templateUrl: './confirmation-dialog.html',
    styleUrl: './confirmation-dialog.scss'
})
export class ConfirmationDialogComponent {
    constructor(@Inject(MAT_DIALOG_DATA) public data: {
        title: string;
        message: string;
    }) {

    }
}
import { Component, EventEmitter, Input, OnInit, Output } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { Router, RouterModule } from '@angular/router';
import { UserSessionService } from '../../../core/auth/services/index.js';
import { CommentType } from '../../books/models/index.js';
import { FormBuilder, FormGroup, ReactiveFormsModule } from '@angular/forms';
import { CommonModule } from '@angular/common';
import { UUIDv4 } from '../../../shared/models/uuid.model.js';
import { E } from '@angular/cdk/keycodes';

@Component({
  selector: 'app-comment-item',
  imports: [
    MatCardModule,
    MatFormFieldModule,
    MatInputModule,
    MatButtonModule,
    RouterModule,
    ReactiveFormsModule,
    CommonModule,
  ],
  templateUrl: './comment-item.html',
  styleUrl: './comment-item.scss'
})
export class CommentItem implements OnInit {
    protected commentForm: FormGroup;
    protected isOnBookDetailsPage: boolean = false;

    @Input() comment!: CommentType;
    @Input() getClickedCommentId!: UUIDv4 | null;

    @Output() delete = new EventEmitter<UUIDv4>();
    @Output() submit = new EventEmitter<[UUIDv4, UUIDv4, string]>();
    @Output() setClickedCommentId = new EventEmitter<UUIDv4 | null>();
    @Output() onCommentEditClick = new EventEmitter <[UUIDv4, string]>();

    constructor(
        protected userSession: UserSessionService,
        private formBuilder: FormBuilder,
        private router: Router,
    ) {
        this.commentForm = formBuilder.group({
            content: ['',
                []
            ]
        })
    }

    ngOnInit(): void {
        this.isOnBookDetailsPage = this.router.url.startsWith('/books/details') ? true : false;
    }

    onSubmit() {      
        const content = this.commentForm.get('content')?.value as string;

        this.submit.emit([this.comment._id, this.comment.bookId, content]);
    }

    onEditClick() {
        this.commentForm.get('content')?.setValue(this.comment.content);
        this.onCommentEditClick.emit([this.comment._id, this.comment.content]);
    }
}

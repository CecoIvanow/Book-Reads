import { ComponentFixture, TestBed } from '@angular/core/testing';

import { CatalogPage } from './catalog';

describe('CatalogPage', () => {
    let component: CatalogPage;
    let fixture: ComponentFixture<CatalogPage>;

    beforeEach(async () => {
        await TestBed.configureTestingModule({
            imports: [CatalogPage]
        })
            .compileComponents();

        fixture = TestBed.createComponent(CatalogPage);
        component = fixture.componentInstance;
        fixture.detectChanges();
    });

    it('should create', () => {
        expect(component).toBeTruthy();
    });
});

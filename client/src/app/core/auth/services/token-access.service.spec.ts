import { TestBed } from '@angular/core/testing';

import { TokenAccessService } from './token-access.service';

describe('TokenAccessService', () => {
  let service: TokenAccessService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(TokenAccessService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});

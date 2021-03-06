import { AuthResponse } from './../shared/models/auth-response.model';
import { Injectable } from '@angular/core';
import { Http, Headers, Response } from '@angular/http';
import { Subject } from 'rxjs/Subject';
import { Observable } from 'rxjs';
import { BaseService } from "./base.service";
import { Router } from '@angular/router';
import { tokenNotExpired } from 'angular2-jwt';

@Injectable()
export class AuthService extends BaseService {
    private loggedIn: boolean = false;

    private token: string;
    private isLoggedInSource = new Subject<boolean>();
    isLoggedIn$ = this.isLoggedInSource.asObservable();

    

    constructor(private http: Http, private router: Router) {
        super(http);
        this.loggedIn = !!localStorage.getItem('auth_token') && tokenNotExpired('auth_token');

    }

    login(username, password) {
        let headers = new Headers();
        headers.append('Content-Type', 'application/json');
        const url = `${this.rootAddress + 'auth'}`;
        return this.http.post(url,
            JSON.stringify({ username: username, password: password }),
            { headers: this.headers })
            .map((response: Response) => {
                let r = response.json() as AuthResponse;
                this.isLoggedInSource.next(r.success);
                if (r.success) {
                    this.token = r.token;
                    localStorage.setItem('auth_token', r.token);
                    this.loggedIn = true;
                }
                return { success: r.success, message: r.message };
            });
    }
    logout() {
        localStorage.removeItem('auth_token');
        this.router.navigate(['/login']);
        this.loggedIn = false;
        this.isLoggedInSource.next(this.loggedIn);
    }
    isLoggedIn() {
        return this.loggedIn && tokenNotExpired('auth_token');
    }

    loginSentinel() {
        const url = `${this.rootAddress + 'auth'}`;

        if (this.isSentinelTokenInvalid()) {
            //console.log('Getting new token');
            return this.http.post(url,
                JSON.stringify({ username: 'sentinel', password: '!!abracadabra@#', issentinel: 'true' }),
                { headers: this.headers })
                .map((response: Response) => {
                    let r = response.json() as AuthResponse;
                    if (r) {
                        this.sentinelToken = r.token;
                        this.setHeadersForSentinel();
                    }
                });
        }
        else {
            //console.log('Reusing existing token');
            
            return Observable.of<any>(() => {
                this.setHeadersForSentinel();
            });
        }
    }

    private isSentinelTokenInvalid(){
        /*console.log('is sentinel token undefined?');
        console.log(this.sentinelToken == undefined);
        console.log('token expired?');
        console.log(!tokenNotExpired(null, this.sentinelToken) );*/
        var isInvalid = (this.sentinelToken == undefined ||
                             !tokenNotExpired(null, this.sentinelToken) 
                             );
       
        return isInvalid;
    }

    private setHeadersForSentinel() {
        if (this.headers.has(this.authHeaderName)) {
            this.headers.set(this.authHeaderName, this.sentinelToken);
        }
        else {
            this.headers.append(this.authHeaderName, this.sentinelToken);
        }
       
    }

    isSentinelLoggedIn(): boolean {
        return this.sentinelLoggedIn && tokenNotExpired(this.sentinelTokenName);
    }
}
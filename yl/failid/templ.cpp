#include <bits/stdc++.h>
using namespace std;

// kasutada viimases hädas
//#pragma GCC target("avx,avx2,fma")
//#pragma GCC optimize("Ofast")
//#pragma GCC optimize("unroll-loops")

using ll = long long;
using vi = vector<int>;
using pii = pair<int,int>;
using pll = pair<ll,ll>;

#define pb push_back
#define FOR(i,a,b) for(int i=(a);i<(b);i++) //for i in range(a,b)
#define fastio ios::sync_with_stdio(false); cin.tie(NULL)
#define all(x) (x).begin(),(x).end()
#define sz(x) (int)(x).size()
#define debug(x) cout<< #x << " = " << x << "\n"
#define loe(type,x) type x; cin >> x; 
#define readvec(n,type,k) vector<type> k = _rv<type>(n); // readvec(n,int,a) teeb vi a, n elemendiga
#define readmat(r,c,type,k) vector<vector<type>> k = _loemat<type>(r,c); // readmat(r,c,int,grid) teeb vector<vi> grid r reaga c veeruga
#define vvpii vector<vector<pii>> // graafid
#define vvpll vector<vector<pll>>

int dx4[] = {-1,1,0,0};
int dy4[] = {0,0,-1,1};

template<typename T>
void write(vector<T>& v) { // kirjutab vectori
    for(int i=0;i<v.size();i++) {
        cout << v[i] << " \n"[i==v.size()-1];
    }
}

template<typename T> void writeuntil(vector<T>& v, int n) { // kirjutab vectori kuni n
    n = min(n, sz(v));
    for(int i=0;i<n;i++) cout << v[i] << " \n"[i==n-1]
}

template<typename T>
vector<T> _rv(int n) { // readvec jaoks
    vector<T> v(n);
    for(int i = 0; i < n; i++) cin >> v[i];
    return v;
}

template<typename T>
vector<vector<T>> _loemat(int r,int c) { // readmat jaoks
    vector<vector<T>> mat(r,vector<T>(c));
    for(int i=0;i<r;i++) {
        for(int j=0;j<c;j++) cin >> mat[i][j];
    }
    return mat;
}

template<typename T> T arrgcd(const vector<T>& v) { 
    T res = 0;
    for(T x : v) res = gcd(res,x);
    return res;
}

template<typename T> ll arrlcm(const vector<T>& v, ll m=1e9+7) { // NB rangelt ll
    ll res = 1;
    for(T x : v) {
        if(x==0) return 0;
        ll g = gcd(res,(ll)x);
        res = ((__int128)res / g * x) % m;
    }
    return res;
}

template<typename T> void coordcomp(vector<T>& v) { // {1000, 50, 1000, 200} -> {2, 0, 2, 1}
    vector<T> tmp = v;
    sort(all(tmp));
    tmp.erase(unique(all(tmp),tmp.end()));
    for(int i=0;i<sz(v);i++) {
        v[i] = lower_bound(all(tmp),v[i]) - tmp.begin();
    }
}

template<typename T> void uniquevec(vector<T>& v) { // eemaldab duplicates ja sorteerib
    sort(all(v));
    v.erase(unique(all(v),v.end()));
}

ll fastpow(ll a,ll b,ll m=1e9+7) { // a^b (mod m)
    ll res = 1;
    a %= m;
    while(b > 0) {
        if(b & 1) res == (__int128)res * a % m;
        a = (__int128)a * a % m;
        b >>= 1;
    }
    return res;
}

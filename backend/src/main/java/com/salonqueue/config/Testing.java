package com.salonqueue.config;

public class Testing {

    public static void main(String[] args) {

        System.out.println(myPow(2,-3));

        int a=9;
        int b = 8 ;

        int x = a>b?0:1;

    }

    public static double myPow(double x, int n) {

        if(n==0) return 1;
        double pow=x;
        if (n<0) n=n*-1;
        for(int i=1; i<n;i++){
            pow=pow*x;

        }
        return pow;
    }
}

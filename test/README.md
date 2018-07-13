Until there is a real test framework in place, this is how you can check if everything works:


```sh
> npm i -g http-serve

> cd ~/wherever/you/store/@tradeshift/io

> http-serve -p 8080 & http-serve -p 8081
```

And then just navigate to http://localhost:8080/test/index.html and check the DevTools console.

"use strict";

var gulp = require('gulp');
var concat = require('gulp-concat');
const minify = require('gulp-minify');
var uglify = require('gulp-uglify');
var inject = require('gulp-inject-string');

gulp.task('default', function() {

    gulp.src('src/*.js')
    .pipe(concat('console-chat.js'))
    .pipe(minify())
    .pipe(gulp.dest('./dist/'));
});
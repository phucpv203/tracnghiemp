#!/usr/bin/env bash
# Script build dùng cho Render khi repo là monorepo.
# Render chạy script này ở root, ta cd vào folder backend rồi cài đặt.
set -e
cd backend
npm install

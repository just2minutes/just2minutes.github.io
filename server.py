#import http.server
#import socketserver

#PORT = 1000

#Handler = http.server.SimpleHTTPRequestHandler

#if __name__ == "__main__":
#    with socketserver.TCPServer(("", PORT), Handler) as http:
#        print(f"Serving at http://localhost:{PORT}")
#        http.serve_forever()
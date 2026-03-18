import { Link } from 'react-router-dom';
import { FileText, Sparkles, ArrowRight, Scale, BookOpen } from 'lucide-react';

export function Home() {
  return (
    <div className="min-h-screen bg-gradient-to-b from-primary-50 to-white">
      {/* Header */}
      <header className="bg-white/80 backdrop-blur-sm border-b border-gray-100 sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center gap-2">
              <div className="w-10 h-10 bg-primary-600 rounded-lg flex items-center justify-center">
                <span className="text-white font-bold text-xl">S</span>
              </div>
              <span className="font-bold text-xl text-gray-900">Simplifica</span>
            </div>
            <div className="flex items-center gap-4">
              <Link
                to="/login"
                className="text-gray-600 hover:text-gray-900 font-medium transition-colors"
              >
                Entrar
              </Link>
              <Link to="/register" className="btn-primary">
                Criar Conta
              </Link>
            </div>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section className="py-20 px-4 sm:px-6 lg:px-8">
        <div className="max-w-4xl mx-auto text-center">
          <div className="inline-flex items-center gap-2 bg-primary-100 text-primary-700 px-4 py-2 rounded-full text-sm font-medium mb-6">
            <Sparkles className="w-4 h-4" />
            Powered by AI
          </div>
          <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold text-gray-900 mb-6">
            Entenda as leis em{' '}
            <span className="text-primary-600">linguagem simples</span>
          </h1>
          <p className="text-xl text-gray-600 mb-8 max-w-2xl mx-auto">
            O Simplifica transforma decretos e publicações oficiais do Diário Oficial 
            em resumos claros e acessíveis para o cidadão comum.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link
              to="/register"
              className="btn-primary text-lg px-8 py-3 flex items-center justify-center gap-2"
            >
              Começar Agora
              <ArrowRight className="w-5 h-5" />
            </Link>
            <a
              href="#como-funciona"
              className="btn-outline text-lg px-8 py-3"
            >
              Como Funciona
            </a>
          </div>
        </div>
      </section>

      {/* Example Section */}
      <section className="py-16 px-4 sm:px-6 lg:px-8 bg-white">
        <div className="max-w-5xl mx-auto">
          <h2 className="text-3xl font-bold text-center text-gray-900 mb-12">
            Veja um exemplo
          </h2>
          <div className="grid md:grid-cols-2 gap-8">
            {/* Original */}
            <div className="card">
              <div className="flex items-center gap-2 mb-4">
                <Scale className="w-5 h-5 text-gray-500" />
                <h3 className="font-semibold text-gray-900">Texto Original</h3>
              </div>
              <div className="bg-gray-50 rounded-lg p-4 text-sm text-gray-700 leading-relaxed">
                <p className="mb-2">
                  <strong>DECRETO Nº 12.345, DE 15 DE MARÇO DE 2026</strong>
                </p>
                <p>
                  Dispõe sobre a isenção de alíquota do ICMS na operação de saída 
                  de implementos agrícolas destinados à atividade rural, nos termos 
                  do Convênio ICMS nº XX/2025, e dá outras providências.
                </p>
                <p className="mt-2 text-gray-500 italic">
                  (Texto continua com 15 páginas de artigos, parágrafos e anexos...)
                </p>
              </div>
            </div>

            {/* Simplified */}
            <div className="card border-primary-200 bg-primary-50/50">
              <div className="flex items-center gap-2 mb-4">
                <Sparkles className="w-5 h-5 text-primary-600" />
                <h3 className="font-semibold text-primary-900">Versão Simplificada</h3>
              </div>
              <div className="bg-white rounded-lg p-4">
                <h4 className="font-bold text-primary-700 mb-2">
                  🚜 Atenção, produtor rural!
                </h4>
                <p className="text-gray-700 mb-3">
                  O governo do estado isentou o ICMS (imposto) na compra de 
                  implementos agrícolas como tratores, colheitadeiras e 
                  equipamentos para lavoura.
                </p>
                <div className="bg-green-50 rounded-lg p-3">
                  <p className="text-sm text-green-800">
                    <strong>O que isso significa para você:</strong> A partir de hoje, 
                    você não paga mais o ICMS na compra desses equipamentos. 
                    Isso pode representar uma economia de até 18% no valor final!
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* How it Works */}
      <section id="como-funciona" className="py-16 px-4 sm:px-6 lg:px-8">
        <div className="max-w-5xl mx-auto">
          <h2 className="text-3xl font-bold text-center text-gray-900 mb-12">
            Como Funciona
          </h2>
          <div className="grid md:grid-cols-3 gap-8">
            <div className="text-center">
              <div className="w-16 h-16 bg-primary-100 rounded-2xl flex items-center justify-center mx-auto mb-4">
                <FileText className="w-8 h-8 text-primary-600" />
              </div>
              <h3 className="font-semibold text-lg text-gray-900 mb-2">
                1. Coleta Automática
              </h3>
              <p className="text-gray-600">
                Buscamos automaticamente as publicações do Diário Oficial 
                do Tocantins todos os dias.
              </p>
            </div>
            <div className="text-center">
              <div className="w-16 h-16 bg-primary-100 rounded-2xl flex items-center justify-center mx-auto mb-4">
                <Sparkles className="w-8 h-8 text-primary-600" />
              </div>
              <h3 className="font-semibold text-lg text-gray-900 mb-2">
                2. IA Simplifica
              </h3>
              <p className="text-gray-600">
                Nossa inteligência artificial lê e transforma o texto jurídico 
                em linguagem simples e acessível.
              </p>
            </div>
            <div className="text-center">
              <div className="w-16 h-16 bg-primary-100 rounded-2xl flex items-center justify-center mx-auto mb-4">
                <BookOpen className="w-8 h-8 text-primary-600" />
              </div>
              <h3 className="font-semibold text-lg text-gray-900 mb-2">
                3. Você Entende
              </h3>
              <p className="text-gray-600">
                Acesse os resumos de forma rápida e saiba exatamente como 
                as leis afetam você.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-16 px-4 sm:px-6 lg:px-8 bg-primary-600">
        <div className="max-w-4xl mx-auto text-center">
          <h2 className="text-3xl font-bold text-white mb-4">
            Pronto para entender as leis?
          </h2>
          <p className="text-primary-100 text-lg mb-8">
            Crie sua conta gratuita e comece a acompanhar as publicações 
            do Diário Oficial em linguagem simples.
          </p>
          <Link
            to="/register"
            className="inline-flex items-center gap-2 bg-white text-primary-600 font-semibold px-8 py-3 rounded-lg hover:bg-primary-50 transition-colors"
          >
            Criar Conta Grátis
            <ArrowRight className="w-5 h-5" />
          </Link>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-gray-900 text-gray-400 py-12 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto">
          <div className="flex flex-col md:flex-row justify-between items-center gap-4">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 bg-primary-600 rounded-lg flex items-center justify-center">
                <span className="text-white font-bold">S</span>
              </div>
              <span className="font-bold text-white">Simplifica</span>
            </div>
            <p className="text-sm">
              © {new Date().getFullYear()} Simplifica. Todos os direitos reservados.
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
}

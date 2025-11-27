import styled from "styled-components";
import { useEffect, useState } from "react";

interface SubProject {
  sub_project_id: number;
  sub_project_name: string;
  sub_project_uuid: string;
  project_name: string;
}

interface Project {
  project_name: string;
  subProjects?: SubProject[];
}

function Main() {
  const [projectList, setProjectList] = useState<Project[]>([]);
  const [isCrawling, setIsCrawling] = useState(false);
  const [selectedRepo, setSelectedRepo] = useState("");

  useEffect(() => {
    loadProjectList();
  }, []);

  const loadProjectList = () => {
    window.electron.ipcRenderer.sendMessage('get-project-list');
    window.electron.ipcRenderer.on('get-project-list', (data: any) => {
      console.log('Received project list:', data);

      // 각 프로젝트에 대해 서브프로젝트 가져오기
      const projectsWithSubs: Project[] = [];

      if (data && data.length > 0) {
        data.forEach((project: any) => {
          window.electron.ipcRenderer.sendMessage('get-sub-project-list', [project.project_name]);
        });

        window.electron.ipcRenderer.on('get-sub-project-list', (subData: any) => {
          if (subData && subData.length > 0) {
            const projectName = subData[0].project_name;
            const existingProject = projectsWithSubs.find(p => p.project_name === projectName);

            if (!existingProject) {
              projectsWithSubs.push({
                project_name: projectName,
                subProjects: subData
              });
            }
          }

          setProjectList([...projectsWithSubs]);
        });
      }
    });
  };

  const handleCrawl = () => {
    setIsCrawling(true);
    window.electron.ipcRenderer.sendMessage('crawl-and-save-repositories');
    window.electron.ipcRenderer.on('crawl-and-save-repositories', (result: any) => {
      setIsCrawling(false);
      if (result.success) {
        console.log(`Successfully crawled ${result.count} projects`);
        loadProjectList();
      } else {
        console.error('Crawl failed:', result.error);
      }
    });
  };

  const handleSelectChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const value = e.target.value;
    setSelectedRepo(value);
    if (value) {
      // 여기서 상세 페이지로 이동하거나 다른 작업 수행
      console.log('Selected repository:', value);
    }
  };

  return (
    <Container>
      <p>"text"1</p>
      <p>"text"2</p>
      <p>"text"3</p>
      <p>"text"4</p>
      <p>"text"5</p>
      <p>"text"6</p>
      <p>"text"7</p>
      <p>"text"8</p>
      <p>"text"9</p>
      <p>"text"10</p>
      <p>"text"11</p>
      <p>"text"12</p>
      <p>"text"13</p>
      <p>"text"14</p>
      <p>"text"15</p>
      <p>"text"16</p>
      <p>"text"17</p>
      <p>"text"18</p>
      <p>"text"19</p>
      <p>"text"20</p>
      <p>"text"21</p>
      <p>"text"22</p>
      <p>"text"23</p>
      <p>"text"24</p>
      <p>"text"25</p>
      <p>"text"26</p>
      <p>"text"27</p>
      <p>"text"28</p>
      <p>"text"29</p>
      <p>"text"30</p>
      <p>"text"31</p>
      <p>"text"32</p>
      <p>"text"33</p>
      <p>"text"34</p>
      <p>"text"35</p>
      <p>"text"36</p>
      <p>"text"37</p>
      <p>"text"38</p>
      <p>"text"39</p>
      <p>"text"40</p>
      <p>"text"41</p>
      <p>"text"42</p>
      <p>"text"43</p>
      <p>"text"44</p>
      <p>"text"45</p>
      <p>"text"46</p>
      <p>"text"47</p>
      <p>"text"48</p>
      <p>"text"49</p>
      <p>"text"50</p>
      <p>"text"51</p>
      <p>"text"52</p>
      <p>"text"53</p>
      <p>"text"54</p>
      <p>"text"55</p>
      <p>"text"56</p>
      <p>"text"57</p>
      <p>"text"58</p>
      <p>"text"59</p>
      <p>"text"60</p>
      <p>"text"61</p>
      <p>"text"62</p>
      <p>"text"63</p>
      <p>"text"64</p>
      <p>"text"65</p>
      <p>"text"66</p>
      <p>"text"67</p>
      <p>"text"68</p>
      <p>"text"69</p>
      <p>"text"70</p>
      <p>"text"71</p>
      <p>"text"72</p>
      <p>"text"73</p>
      <p>"text"74</p>
      <p>"text"75</p>
      <p>"text"76</p>
      <p>"text"77</p>
      <p>"text"78</p>
      <p>"text"79</p>
      <p>"text"80</p>
      <p>"text"81</p>
      <p>"text"82</p>
      <p>"text"83</p>
      <p>"text"84</p>
      <p>"text"85</p>
      <p>"text"86</p>
      <p>"text"87</p>
      <p>"text"88</p>
      <p>"text"89</p>
      <p>"text"90</p>
      <p>"text"91</p>
      <p>"text"92</p>
      <p>"text"93</p>
      <p>"text"94</p>
      <p>"text"95</p>
      <p>"text"96</p>
      <p>"text"97</p>
      <p>"text"98</p>
      <p>"text"99</p>
      <p>"text"100</p>
      <p>"text"101</p>
      <p>"text"102</p>
      <p>"text"103</p>
      <p>"text"104</p>
      <p>"text"105</p>
      <p>"text"106</p>
      <p>"text"107</p>
      <p>"text"108</p>
      <p>"text"109</p>
      <p>"text"110</p>
      <p>"text"111</p>
      <p>"text"112</p>
      <p>"text"113</p>
      <p>"text"114</p>
      <p>"text"115</p>
      <p>"text"116</p>
      <p>"text"117</p>
      <p>"text"118</p>
      <p>"text"119</p>
      <p>"text"120</p>
      <p>"text"121</p>
      <p>"text"122</p>
      <p>"text"123</p>
      <p>"text"124</p>
      <p>"text"125</p>
      <p>"text"126</p>
      <p>"text"127</p>
      <p>"text"128</p>
      <p>"text"129</p>
      <p>"text"130</p>
      <p>"text"131</p>
      <p>"text"132</p>
      <p>"text"133</p>
      <p>"text"134</p>
      <p>"text"135</p>
      <p>"text"136</p>
      <p>"text"137</p>
      <p>"text"138</p>
      <p>"text"139</p>
      <p>"text"140</p>
      <p>"text"141</p>
      <p>"text"142</p>
      <p>"text"143</p>
      <p>"text"144</p>
      <p>"text"145</p>
      <p>"text"146</p>
      <p>"text"147</p>
      <p>"text"148</p>
      <p>"text"149</p>
      <p>"text"150</p>
      <p>"text"151</p>
      <p>"text"152</p>
      <p>"text"153</p>
      <p>"text"154</p>
      <p>"text"155</p>
      <p>"text"156</p>
      <p>"text"157</p>
      <p>"text"158</p>
      <p>"text"159</p>
      <p>"text"160</p>
      <p>"text"161</p>
      <p>"text"162</p>
      <p>"text"163</p>
      <p>"text"164</p>
      <p>"text"165</p>
      <p>"text"166</p>
      <p>"text"167</p>
      <p>"text"168</p>
      <p>"text"169</p>
      <p>"text"170</p>
      <p>"text"171</p>
      <p>"text"172</p>
      <p>"text"173</p>
      <p>"text"174</p>
      <p>"text"175</p>
      <p>"text"176</p>
      <p>"text"177</p>
      <p>"text"178</p>
      <p>"text"179</p>
      <p>"text"180</p>
      <p>"text"181</p>
      <p>"text"182</p>
      <p>"text"183</p>
      <p>"text"184</p>
      <p>"text"185</p>
      <p>"text"186</p>
      <p>"text"187</p>
      <p>"text"188</p>
      <p>"text"189</p>
      <p>"text"190</p>
      <p>"text"191</p>
      <p>"text"192</p>
      <p>"text"193</p>
      <p>"text"194</p>
      <p>"text"195</p>
      <p>"text"196</p>
      <p>"text"197</p>
      <p>"text"198</p>
      <p>"text"199</p>
      <p>"text"200</p>
      <p>"text"201</p>
      <p>"text"202</p>
      <p>"text"203</p>
      <p>"text"204</p>
      <p>"text"205</p>
      <p>"text"206</p>
      <p>"text"207</p>
      <p>"text"208</p>
      <p>"text"209</p>
      <p>"text"210</p>
      <p>"text"211</p>
      <p>"text"212</p>
      <p>"text"213</p>
      <p>"text"214</p>
      <p>"text"215</p>
      <p>"text"216</p>
      <p>"text"217</p>
      <p>"text"218</p>
      <p>"text"219</p>
      <p>"text"220</p>
      <p>"text"221</p>
      <p>"text"222</p>
      <p>"text"223</p>
      <p>"text"224</p>
      <p>"text"225</p>
      <p>"text"226</p>
      <p>"text"227</p>
      <p>"text"228</p>
      <p>"text"229</p>
      <p>"text"230</p>
      <p>"text"231</p>
      <p>"text"232</p>
      <p>"text"233</p>
      <p>"text"234</p>
      <p>"text"235</p>
      <p>"text"236</p>
      <p>"text"237</p>
      <p>"text"238</p>
      <p>"text"239</p>
      <p>"text"240</p>
      <p>"text"241</p>
      <p>"text"242</p>
      <p>"text"243</p>
      <p>"text"244</p>
      <p>"text"245</p>
      <p>"text"246</p>
      <p>"text"247</p>
      <p>"text"248</p>
      <p>"text"249</p>
      <p>"text"250</p>
      <p>"text"251</p>
      <p>"text"252</p>
      <p>"text"253</p>
      <p>"text"254</p>
      <p>"text"255</p>
      <p>"text"256</p>
      <p>"text"257</p>
      <p>"text"258</p>
      <p>"text"259</p>
      <p>"text"260</p>
      <p>"text"261</p>
      <p>"text"262</p>
      <p>"text"263</p>
      <p>"text"264</p>
      <p>"text"265</p>
      <p>"text"266</p>
      <p>"text"267</p>
      <p>"text"268</p>
      <p>"text"269</p>
      <p>"text"270</p>
      <p>"text"271</p>
      <p>"text"272</p>
      <p>"text"273</p>
      <p>"text"274</p>
      <p>"text"275</p>
      <p>"text"276</p>
      <p>"text"277</p>
      <p>"text"278</p>
      <p>"text"279</p>
      <p>"text"280</p>
      <p>"text"281</p>
      <p>"text"282</p>
      <p>"text"283</p>
      <p>"text"284</p>
      <p>"text"285</p>
      <p>"text"286</p>
      <p>"text"287</p>
      <p>"text"288</p>
      <p>"text"289</p>
      <p>"text"290</p>
      <p>"text"291</p>
      <p>"text"292</p>
      <p>"text"293</p>
      <p>"text"294</p>
      <p>"text"295</p>
      <p>"text"296</p>
      <p>"text"297</p>
      <p>"text"298</p>
      <p>"text"299</p>
      <p>"text"300</p>
    </Container>
  );
}

const Container = styled.div`
  display: flex;
  flex-direction: column;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  width: 100%;
  min-height: 100%;
  padding: 0px;
`;


export default Main;
